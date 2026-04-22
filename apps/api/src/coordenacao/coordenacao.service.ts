import { Injectable, ForbiddenException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PlanningStatus, RequestStatus, RoleLevel } from '@prisma/client';
import type { JwtPayload } from '../auth/interfaces/jwt-payload.interface';

function hasRole(user: JwtPayload, ...levels: RoleLevel[]): boolean {
  return Array.isArray(user.roles) && user.roles.some((r: any) => levels.includes(r?.level));
}

/** Resolve unitId: aceita override explícito (STAFF_CENTRAL/MANTENEDORA) ou usa token do usuário.
 * Para STAFF_CENTRAL/MANTENEDORA/DEVELOPER sem unitId no token e sem override, retorna null
 * (indica busca ampla por mantenedoraId). */
function resolveUnitId(user: JwtPayload, override?: string): string | null {
  if (override) return override;
  if (user.unitId) return user.unitId;
  // STAFF_CENTRAL e acima podem não ter unitId no token — busca ampla por mantenedoraId
  const isStaffOrAbove = Array.isArray(user.roles) && user.roles.some(
    (r: any) => ['STAFF_CENTRAL', 'MANTENEDORA', 'DEVELOPER'].includes(r?.level),
  );
  if (isStaffOrAbove) return null;
  throw new ForbiddenException('unitId é obrigatório para este papel');
}

@Injectable()
export class CoordenacaoService {
  private cache = new Map<string, { data: unknown; expiresAt: number }>();

  private async cached<T>(key: string, ttlSeconds: number, fn: () => Promise<T>): Promise<T> {
    const hit = this.cache.get(key);
    if (hit && hit.expiresAt > Date.now()) return hit.data as T;
    const data = await fn();
    this.cache.set(key, { data, expiresAt: Date.now() + ttlSeconds * 1000 });
    return data;
  }

  constructor(private readonly prisma: PrismaService) {}

  // ─── REUNIÕES / PAUTAS ───────────────────────────────────────────────────

  async criarReuniao(dto: any, user: JwtPayload) {
    if (!user?.mantenedoraId) throw new ForbiddenException('Escopo inválido');
    return this.prisma.coordenacaoReuniao.create({
      data: {
        mantenedoraId: user.mantenedoraId,
        unitId: dto.unitId ?? user.unitId ?? null,
        tipo: dto.tipo ?? 'UNIDADE',
        status: 'RASCUNHO',
        titulo: dto.titulo,
        descricao: dto.descricao ?? null,
        dataRealizacao: new Date(dto.dataRealizacao),
        localOuLink: dto.localOuLink ?? null,
        criadoPorId: user.sub,
      },
    });
  }

  async listarReunioes(tipo: string, status: string, user: JwtPayload) {
    if (!user?.mantenedoraId) throw new ForbiddenException('Escopo inválido');
    const where: any = { mantenedoraId: user.mantenedoraId };
    if (tipo) where.tipo = tipo;
    if (status) where.status = status;
    if (hasRole(user, RoleLevel.PROFESSOR) && !hasRole(user, RoleLevel.UNIDADE, RoleLevel.STAFF_CENTRAL, RoleLevel.MANTENEDORA, RoleLevel.DEVELOPER)) {
      where.status = 'PUBLICADA';
      if (user.unitId) where.unitId = user.unitId;
    } else if (hasRole(user, RoleLevel.UNIDADE) && !hasRole(user, RoleLevel.STAFF_CENTRAL, RoleLevel.MANTENEDORA, RoleLevel.DEVELOPER)) {
      if (user.unitId) where.unitId = user.unitId;
    }
    return this.prisma.coordenacaoReuniao.findMany({
      where,
      include: {
        participantes: { select: { usuarioId: true, presente: true } },
        atas: { select: { id: true, criadoEm: true } },
      },
      orderBy: { dataRealizacao: 'desc' },
      take: 50,
    });
  }

  async getReuniao(id: string, user: JwtPayload) {
    const reuniao = await this.prisma.coordenacaoReuniao.findUnique({
      where: { id },
      include: { participantes: true, atas: true },
    });
    if (!reuniao) throw new NotFoundException('Reunião não encontrada');
    if (reuniao.mantenedoraId !== user.mantenedoraId) throw new ForbiddenException('Fora do escopo');
    return reuniao;
  }

  async atualizarStatus(id: string, dto: any, user: JwtPayload) {
    const reuniao = await this.prisma.coordenacaoReuniao.findUnique({ where: { id } });
    if (!reuniao) throw new NotFoundException('Reunião não encontrada');
    if (reuniao.mantenedoraId !== user.mantenedoraId) throw new ForbiddenException('Fora do escopo');
    const data: any = { status: dto.status };
    if (dto.status === 'PUBLICADA') data.publicadaEm = new Date();
    return this.prisma.coordenacaoReuniao.update({ where: { id }, data });
  }

  async atualizarPauta(id: string, dto: any, user: JwtPayload) {
    const reuniao = await this.prisma.coordenacaoReuniao.findUnique({ where: { id } });
    if (!reuniao) throw new NotFoundException('Reunião não encontrada');
    if (reuniao.mantenedoraId !== user.mantenedoraId) throw new ForbiddenException('Fora do escopo');
    const isCoordinator = user.roles.some((role) => role.level === RoleLevel.UNIDADE);
    if (!isCoordinator) throw new ForbiddenException('Apenas a Coordenação da Unidade pode editar a pauta.');
    return this.prisma.coordenacaoReuniao.update({
      where: { id },
      data: {
        descricao: dto.descricao ?? reuniao.descricao,
        localOuLink: dto.localOuLink ?? reuniao.localOuLink,
        dataRealizacao: dto.dataRealizacao ? new Date(dto.dataRealizacao) : reuniao.dataRealizacao,
      },
    });
  }

  async registrarAta(reuniaoId: string, dto: any, user: JwtPayload) {
    const reuniao = await this.prisma.coordenacaoReuniao.findUnique({ where: { id: reuniaoId } });
    if (!reuniao) throw new NotFoundException('Reunião não encontrada');
    if (reuniao.mantenedoraId !== user.mantenedoraId) throw new ForbiddenException('Fora do escopo');
    return this.prisma.coordenacaoAta.create({
      data: {
        reuniaoId,
        conteudo: dto.conteudo,
        pautaJson: dto.pautaJson ?? null,
        encaminhamentosJson: dto.encaminhamentosJson ?? null,
        redigidoPorId: user.sub,
      },
    });
  }

  // ─── DASHBOARD UNIDADE (aceita unitId override para STAFF_CENTRAL) ─────────

  async getDashboardUnidade(user: JwtPayload, unitIdOverride?: string) {
    if (!user?.mantenedoraId) throw new ForbiddenException('Escopo inválido');
    const unitIdRaw = resolveUnitId(user, unitIdOverride);
    if (!unitIdRaw) throw new ForbiddenException('Selecione uma unidade para ver o dashboard da unidade');
    const unitId: string = unitIdRaw;
    const today = new Date().toISOString().slice(0, 10);
    const cacheKey = `coord:unidade:${unitId}:${today}`;
    return this.cached(cacheKey, 60, async () => {
    try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);
    const todayRange = { gte: today, lte: todayEnd };

    const [
      turmas,
      requisicoesPendentes,
      planejamentosRascunho,
      planejamentosPublicados,
      planejamentosEmRevisao,
      diariosHoje,
      reunioesAgendadas,
    ] = await Promise.all([
      this.prisma.classroom.findMany({
        where: { unitId },
        include: {
          enrollments: { where: { status: 'ATIVA' }, select: { id: true } },
          teachers: {
            where: { isActive: true },
            include: { teacher: { select: { id: true, firstName: true, lastName: true } } },
            take: 1,
          },
        },
      }),
      this.prisma.materialRequest.count({ where: { unitId, status: RequestStatus.SOLICITADO } }),
      this.prisma.planning.count({ where: { unitId, status: PlanningStatus.RASCUNHO } }),
      this.prisma.planning.count({ where: { unitId, status: PlanningStatus.APROVADO } }),
      this.prisma.planning.count({ where: { unitId, status: PlanningStatus.EM_REVISAO } }),
      this.prisma.diaryEvent.count({ where: { unitId, eventDate: todayRange } }),
      this.prisma.coordenacaoReuniao.count({
        where: { mantenedoraId: user.mantenedoraId, unitId, status: 'AGENDADA', dataRealizacao: { gte: today } },
      }),
    ]);

    const totalAlunos = turmas.reduce((sum, t) => sum + t.enrollments.length, 0);

    const turmasComChamada = await this.prisma.attendance.groupBy({
      by: ['classroomId'],
      where: { unitId, date: todayRange },
    });

    const requisicoesDetalhes = await this.prisma.materialRequest.findMany({
      where: { unitId, status: RequestStatus.SOLICITADO },
      include: {
        createdByUser: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
        classroom: {
          select: { id: true, name: true },
        },
      },
      orderBy: { requestedDate: 'desc' },
      take: 20,
    });

    // FIX Bug 4: inclui EM_REVISAO na lista de planejamentos para revisão
    const planejamentosRevisao = await this.prisma.planning.findMany({
      where: { unitId, status: { in: [PlanningStatus.RASCUNHO, PlanningStatus.EM_REVISAO] } },
      select: { id: true, title: true, createdBy: true, startDate: true, endDate: true, classroomId: true, status: true },
      orderBy: { startDate: 'asc' },
      take: 20,
    });

    const proximasReunioes = await this.prisma.coordenacaoReuniao.findMany({
      where: { mantenedoraId: user.mantenedoraId, unitId, dataRealizacao: { gte: today } },
      orderBy: { dataRealizacao: 'asc' },
      take: 5,
    });

    // Alertas acionáveis: turmas sem chamada hoje
    const turmasSemChamadaHoje = turmas
      .filter((t: any) => !turmasComChamada.some((c) => c.classroomId === t.id))
      .map((t: any) => ({ id: t.id, nome: t.name }));

    // Alertas acionáveis: planejamentos devolvidos parados há 3+ dias
    const limiteDevolvido = new Date();
    limiteDevolvido.setDate(limiteDevolvido.getDate() - 3);
    const planejamentosParados = await this.prisma.planning.findMany({
      where: {
        unitId,
        status: PlanningStatus.DEVOLVIDO,
        updatedAt: { lt: limiteDevolvido },
      },
      select: { id: true, title: true, updatedAt: true },
      take: 10,
    });

    return {
      unitId,
      data: today.toISOString(),
      alertas: { turmasSemChamadaHoje, planejamentosParados },
      indicadores: {
        totalTurmas: turmas.length,
        totalAlunos,
        requisicoesPendentes,
        planejamentosRascunho,
        planejamentosEmRevisao,
        planejamentosPublicados,
        diariosHoje,
        turmasComChamadaHoje: turmasComChamada.length,
        reunioesAgendadas,
        // FIX D: totalProfessores — professores únicos ativos nas turmas da unidade
        totalProfessores: new Set(
          turmas.flatMap((t) => t.teachers.map((ct) => ct.teacher.id))
        ).size,
      },
      turmas: turmas.map((t) => ({
        id: t.id,
        nome: t.name,
        totalAlunos: t.enrollments.length,
        professor: t.teachers[0]?.teacher
          ? `${t.teachers[0].teacher.firstName} ${t.teachers[0].teacher.lastName}`
          : null,
        chamadaFeita: turmasComChamada.some((c) => c.classroomId === t.id),
      })),
      requisicoesPendentesDetalhes: requisicoesDetalhes,
      planejamentosParaRevisao: planejamentosRevisao,
      proximasReunioes,
    };
    } catch (error) {
      if (error instanceof ForbiddenException) throw error;
      console.error('[CoordenacaoService] getDashboardUnidade error:', error);
      return {
        hasError: true,
        unitId,
        data: new Date().toISOString(),
        alertas: { turmasSemChamadaHoje: [], planejamentosParados: [] },
        indicadores: {
          totalTurmas: 0, totalAlunos: 0, requisicoesPendentes: 0,
          planejamentosRascunho: 0, planejamentosEmRevisao: 0, planejamentosPublicados: 0,
          diariosHoje: 0, turmasComChamadaHoje: 0, reunioesAgendadas: 0, totalProfessores: 0,
        },
        turmas: [],
        requisicoesPendentesDetalhes: [],
        planejamentosParaRevisao: [],
        proximasReunioes: [],
      };
    }
    });
  }

  // ─── DASHBOARD GERAL ──────────────────────────────────────────────────────

  async getDashboardGeral(user: JwtPayload) {
    if (!user?.mantenedoraId) throw new ForbiddenException('Escopo inválido');
    const today = new Date().toISOString().slice(0, 10);
    const cacheKey = `coord:geral:${user.mantenedoraId}:${today}`;
    return this.cached(cacheKey, 120, async () => {
    try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);
    const todayRange = { gte: today, lte: todayEnd };

    const [
      unidades,
      totalAlunos,
      requisicoesPendentes,
      planejamentosRascunho,
      diariosHoje,
      reunioesAgendadas,
    ] = await Promise.all([
      this.prisma.unit.findMany({
        where: { mantenedoraId: user.mantenedoraId },
        include: {
          classrooms: {
            include: {
              enrollments: { where: { status: 'ATIVA' }, select: { id: true } },
              teachers: { where: { isActive: true }, select: { teacherId: true } },
            },
          },
        },
      }),
      this.prisma.enrollment.count({
        where: { status: 'ATIVA', classroom: { unit: { mantenedoraId: user.mantenedoraId } } },
      }),
      this.prisma.materialRequest.count({ where: { mantenedoraId: user.mantenedoraId, status: RequestStatus.SOLICITADO } }),
      this.prisma.planning.count({ where: { mantenedoraId: user.mantenedoraId, status: PlanningStatus.RASCUNHO } }),
      this.prisma.diaryEvent.count({ where: { mantenedoraId: user.mantenedoraId, eventDate: todayRange } }),
      this.prisma.coordenacaoReuniao.count({
        where: { mantenedoraId: user.mantenedoraId, status: 'AGENDADA', dataRealizacao: { gte: today } },
      }),
    ]);

    // FIX Bug 3: contar professores únicos (não vínculos duplicados)
    const todosTeacherIds = new Set(
      unidades.flatMap((u) => u.classrooms.flatMap((c) => c.teachers.map((ct) => ct.teacherId))),
    );
    const totalProfessores = todosTeacherIds.size;

    const consolidadoUnidades = await Promise.all(
      unidades.map(async (unidade) => {
        const [reqPendentes, planRascunho, diariosUnidade, chamadaUnidade] = await Promise.all([
          this.prisma.materialRequest.count({ where: { unitId: unidade.id, status: RequestStatus.SOLICITADO } }),
          this.prisma.planning.count({ where: { unitId: unidade.id, status: PlanningStatus.RASCUNHO } }),
          this.prisma.diaryEvent.count({ where: { unitId: unidade.id, eventDate: todayRange } }),
          this.prisma.attendance.groupBy({ by: ['classroomId'], where: { unitId: unidade.id, date: todayRange } }),
        ]);
        const totalAlunosUnidade = unidade.classrooms.reduce((sum, c) => sum + c.enrollments.length, 0);
        const professoresUnidade = new Set(unidade.classrooms.flatMap((c) => c.teachers.map((ct) => ct.teacherId))).size;
        return {
          id: unidade.id,
          nome: unidade.name,
          totalTurmas: unidade.classrooms.length,
          totalAlunos: totalAlunosUnidade,
          totalProfessores: professoresUnidade,
          requisicoesPendentes: reqPendentes,
          planejamentosRascunho: planRascunho,
          diariosHoje: diariosUnidade,
          turmasComChamada: chamadaUnidade.length,
          coberturaChamada:
            unidade.classrooms.length > 0
              ? Math.round((chamadaUnidade.length / unidade.classrooms.length) * 100)
              : 0,
        };
      }),
    );

    const ultimasReunioes = await this.prisma.coordenacaoReuniao.findMany({
      where: { mantenedoraId: user.mantenedoraId, tipo: 'REDE' },
      orderBy: { dataRealizacao: 'desc' },
      take: 5,
    });

    const proximasReunioes = await this.prisma.coordenacaoReuniao.findMany({
      where: { mantenedoraId: user.mantenedoraId, dataRealizacao: { gte: today }, status: 'AGENDADA' },
      orderBy: { dataRealizacao: 'asc' },
      take: 5,
    });

    return {
      mantenedoraId: user.mantenedoraId,
      data: today.toISOString(),
      indicadoresGerais: {
        totalUnidades: unidades.length,
        totalAlunos,
        totalProfessores,
        requisicoesPendentes,
        planejamentosRascunho,
        diariosHoje,
        reunioesAgendadas,
      },
      consolidadoUnidades,
      ultimasReunioes,
      proximasReunioes,
    };
    } catch (error) {
      if (error instanceof ForbiddenException) throw error;
      console.error('[CoordenacaoService] getDashboardGeral error:', error);
      return {
        hasError: true,
        mantenedoraId: user.mantenedoraId,
        data: new Date().toISOString(),
        indicadoresGerais: {
          totalUnidades: 0, totalAlunos: 0, totalProfessores: 0,
          requisicoesPendentes: 0, planejamentosRascunho: 0,
          diariosHoje: 0, reunioesAgendadas: 0,
        },
        consolidadoUnidades: [],
        ultimasReunioes: [],
        proximasReunioes: [],
      };
    }
    });
  }

  // ─── PLANEJAMENTOS (aceita unitId override) ────────────────────────────────

  async listarPlanejamentos(status: string, classroomId: string, user: JwtPayload, unitIdOverride?: string, startDate?: string, endDate?: string) {
    if (!user?.mantenedoraId) throw new ForbiddenException('Escopo inválido');
    const unitId = resolveUnitId(user, unitIdOverride);
    // STAFF_CENTRAL sem unitId: busca por mantenedoraId (todas as unidades)
    const where: any = unitId ? { unitId } : { mantenedoraId: user.mantenedoraId };
    if (status) {
      where.status = status;
    } else {
      where.status = { notIn: ['CANCELADO'] };
    }
    if (classroomId) where.classroomId = classroomId;
    // Filtro por overlap de período (planejamentos que cruzam o período solicitado)
    // Overlap: planning.startDate <= endDate AND planning.endDate >= startDate
    if (startDate && endDate) {
      const start = new Date(startDate);
      const end = new Date(endDate);
      (where as any).AND = [
        ...((where.AND as any[]) ?? []),
        { startDate: { lte: end } },
        { endDate: { gte: start } },
      ];
    } else if (startDate) {
      where.endDate = { gte: new Date(startDate) };
    } else if (endDate) {
      where.startDate = { lte: new Date(endDate) };
    }
    return this.prisma.planning.findMany({
      where,
      include: {
        classroom: {
          select: {
            id: true,
            name: true,
            unit: { select: { id: true, name: true } },
          },
        },
        template: { select: { id: true, name: true } },
        createdByUser: { select: { id: true, firstName: true, lastName: true, email: true } },
      },
      orderBy: { updatedAt: 'desc' },
      take: 200,
    });
  }

  // FIX Bug 5: aprovarPlanejamento agora usa DEVOLVIDO (não RASCUNHO) e salva reviewComment/reviewedBy/reviewedAt
  async aprovarPlanejamento(id: string, dto: any, user: JwtPayload) {
    const planning = await this.prisma.planning.findUnique({ where: { id } });
    if (!planning) throw new NotFoundException('Planejamento não encontrado');
    const isCoordinator = user.roles.some((role) => role.level === RoleLevel.UNIDADE);
    if (!isCoordinator) {
      throw new ForbiddenException('Apenas a Coordenação da Unidade pode aprovar planejamentos.');
    }
    if (user.unitId && planning.unitId !== user.unitId) throw new ForbiddenException('Fora do escopo');

    const novoStatus = dto.aprovar ? PlanningStatus.APROVADO : PlanningStatus.DEVOLVIDO;
    const updateData: any = { status: novoStatus, updatedAt: new Date() };
    if (dto.comentario) updateData.reviewComment = dto.comentario;
    updateData.reviewedBy = user.sub;
    updateData.reviewedAt = new Date();

    return this.prisma.planning.update({ where: { id }, data: updateData });
  }

  // ─── DIÁRIOS (aceita unitId override) ─────────────────────────────────────

  async listarDiarios(classroomId: string, startDate: string, endDate: string, user: JwtPayload, unitIdOverride?: string) {
    if (!user?.mantenedoraId) throw new ForbiddenException('Escopo inválido');
    const unitId = resolveUnitId(user, unitIdOverride);
    // STAFF_CENTRAL sem unitId: busca por mantenedoraId (todas as unidades)
    const where: any = unitId ? { unitId } : { mantenedoraId: user.mantenedoraId };
    if (classroomId) where.classroomId = classroomId;
    if (startDate && endDate) {
      where.eventDate = { gte: new Date(startDate), lte: new Date(endDate) };
    } else {
      // Janela padrão: 30 dias atrás até fim do dia de hoje (timezone-safe)
      const end = new Date();
      end.setHours(23, 59, 59, 999);
      const start = new Date();
      start.setDate(start.getDate() - 30);
      start.setHours(0, 0, 0, 0);
      where.eventDate = { gte: start, lte: end };
    }
    const eventos = await this.prisma.diaryEvent.findMany({
      where,
      include: {
        classroom: { select: { id: true, name: true } },
        child: { select: { id: true, firstName: true, lastName: true } },
        createdByUser: { select: { id: true, firstName: true, lastName: true, email: true } },
        curriculumEntry: {
          select: {
            id: true,
            campoDeExperiencia: true,
            objetivoBNCC: true,
            objetivoBNCCCode: true,
            objetivoCurriculo: true,
            intencionalidade: true,
          },
        },
        planning: {
          select: {
            id: true,
            title: true,
            status: true,
            description: true,
            pedagogicalContent: true,
          },
        },
      },
      orderBy: { eventDate: 'desc' },
      take: 200,
    });

    const planningIds = eventos
      .map((e) => e.planningId)
      .filter((id): id is string => Boolean(id));

    const conferenciasMap = new Map<string, { status: string; observacao: string | null }>();
    if (planningIds.length > 0) {
      try {
        const conferencias = await this.prisma.planningConferencia.findMany({
          where: { planningId: { in: planningIds } },
          select: { planningId: true, status: true, observacao: true, dataConferencia: true },
          orderBy: { dataConferencia: 'desc' },
        });
        for (const c of conferencias) {
          if (!conferenciasMap.has(c.planningId)) {
            conferenciasMap.set(c.planningId, {
              status: c.status,
              observacao: c.observacao,
            });
          }
        }
      } catch {
        // fallback silencioso caso o modelo/tabela não esteja disponível em algum ambiente
      }
    }

    const metricasPorTurma = new Map<string, {
      total: number; publicados: number; comMatriz: number; comPlano: number;
    }>();

    for (const e of eventos) {
      const cid = e.classroomId;
      if (!metricasPorTurma.has(cid)) {
        metricasPorTurma.set(cid, { total: 0, publicados: 0, comMatriz: 0, comPlano: 0 });
      }
      const m = metricasPorTurma.get(cid)!;
      m.total += 1;
      if (['PUBLICADO', 'REVISADO', 'ARQUIVADO'].includes(e.status)) m.publicados += 1;
      if (e.curriculumEntryId) m.comMatriz += 1;
      if (e.planningId) m.comPlano += 1;
    }

    return {
      diarios: eventos.map((e) => ({
        ...e,
        conferencia: e.planningId ? conferenciasMap.get(e.planningId) ?? null : null,
      })),
      metricas: Object.fromEntries(metricasPorTurma),
    };
  }

  // ─── TURMAS COM STATS (aceita unitId override) ─────────────────────────────

  async getUnitClassrooms(user: JwtPayload, unitIdOverride?: string) {
    if (!user?.mantenedoraId) throw new ForbiddenException('Escopo inválido');
    const unitIdRaw = resolveUnitId(user, unitIdOverride);
    if (!unitIdRaw) throw new ForbiddenException('Selecione uma unidade para ver as turmas');
    const unitId: string = unitIdRaw;
    const classrooms = await this.prisma.classroom.findMany({
      where: { unitId: unitId, isActive: true },
      include: {
        enrollments: { where: { status: 'ATIVA' }, select: { id: true } },
        teachers: {
          where: { isActive: true },
          include: { teacher: { select: { id: true, firstName: true, lastName: true, email: true } } },
        },
      },
      orderBy: { name: 'asc' },
    });

    const classroomIds = classrooms.map((c) => c.id);
    const plansRaw = await this.prisma.planning.groupBy({
      by: ['classroomId'],
      where: { classroomId: { in: classroomIds }, status: PlanningStatus.PUBLICADO },
      _count: { id: true },
    });
    const plansMap = new Map(plansRaw.map((p) => [p.classroomId, p._count.id]));

    const totalChildrenUnit = await this.prisma.enrollment.count({
      where: { classroom: { unitId }, status: 'ATIVA' },
    });

    return {
      unitId,
      totalChildrenUnit,
      classrooms: classrooms.map((c) => ({
        id: c.id,
        name: c.name,
        code: c.code,
        ageGroupMin: (c as any).ageGroupMin ?? null,
        ageGroupMax: (c as any).ageGroupMax ?? null,
        childrenCount: c.enrollments.length,
        teachers: c.teachers.map((ct) => ({
          id: ct.teacher.id,
          firstName: ct.teacher.firstName,
          lastName: ct.teacher.lastName,
          email: ct.teacher.email,
        })),
        plansCount: plansMap.get(c.id) ?? 0,
      })),
    };
  }

  // ─── UNIT CONTEXT SUMMARY (carregamento rápido) ────────────────────────────

  /**
   * Retorna resumo leve de uma unidade para preload do contexto central.
   * Usado pelo frontend ao selecionar uma unidade no painel STAFF_CENTRAL.
   */
  async getUnitContextSummary(user: JwtPayload, unitIdOverride?: string) {
    if (!user?.mantenedoraId) throw new ForbiddenException('Escopo inválido');

    const isCentral = Array.isArray(user.roles) && user.roles.some(
      (r: any) => ['STAFF_CENTRAL', 'MANTENEDORA', 'DEVELOPER'].includes(r?.level),
    );

    // UNIDADE: ignora override e usa token.unitId
    const unitId = isCentral
      ? (unitIdOverride ?? user.unitId ?? null)
      : (user.unitId ?? null);

    if (!unitId) throw new ForbiddenException('unitId é obrigatório para este endpoint');

    // Validar que a unidade pertence à mantenedora do usuário
    const unit = await this.prisma.unit.findFirst({
      where: { id: unitId, mantenedoraId: user.mantenedoraId },
      select: { id: true, name: true, code: true, city: true, state: true },
    });
    if (!unit) throw new ForbiddenException('Unidade não encontrada ou fora do escopo');

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const weekStart = new Date(today);
    weekStart.setDate(today.getDate() - today.getDay()); // domingo
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);
    weekEnd.setHours(23, 59, 59, 999);

    const [classrooms, children, teachers, staff, plansPending, diariesThisWeek, rdicPublished] =
      await Promise.all([
        this.prisma.classroom.count({ where: { unitId, isActive: true } }),
        this.prisma.enrollment.count({ where: { status: 'ATIVA', classroom: { unitId } } }),
        this.prisma.classroomTeacher.count({ where: { isActive: true, classroom: { unitId } } }),
        // UserRoleUnitScope: conta usuários com escopo na unidade e role UNIDADE
        this.prisma.userRoleUnitScope.count({ where: { unitId, userRole: { role: { level: RoleLevel.UNIDADE } } } }).catch(() => 0),
        this.prisma.planning.count({ where: { unitId, status: { in: [PlanningStatus.RASCUNHO, PlanningStatus.EM_REVISAO] } } }),
        this.prisma.diaryEvent.count({ where: { unitId, eventDate: { gte: weekStart, lte: weekEnd } } }),
        // ReportBase: conta RDICs gerados para a unidade
        this.prisma.reportBase.count({ where: { unitId, reportType: 'RDIC', isGenerated: true } }).catch(() => 0),
      ]);

    return {
      unit: { id: unit.id, name: unit.name, code: unit.code, city: unit.city, state: unit.state },
      counts: { classrooms, children, teachers, staff },
      recent: { plansPending, diariesThisWeek, rdicPublished },
    };
  }

  // ─── REQUISIÇÕES (aceita unitId override) ─────────────────────────────────

  async listarRequisicoes(status: string, user: JwtPayload, unitIdOverride?: string) {
    if (!user?.mantenedoraId) throw new ForbiddenException('Escopo inválido');
    const unitId = resolveUnitId(user, unitIdOverride);
    // STAFF_CENTRAL sem unitId: busca por mantenedoraId (todas as unidades)
    const where: any = unitId ? { unitId } : { mantenedoraId: user.mantenedoraId };
    if (status) where.status = status;
    else where.status = RequestStatus.SOLICITADO;
    return this.prisma.materialRequest.findMany({
      where,
      include: {
        createdByUser: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
        classroom: {
          select: { id: true, name: true },
        },
      },
      orderBy: { requestedDate: 'desc' },
      take: 100,
    });
  }
}
