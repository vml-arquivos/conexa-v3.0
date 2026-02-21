import { Injectable, ForbiddenException, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PlanningStatus, RequestStatus, RoleLevel } from '@prisma/client';
import type { JwtPayload } from '../auth/interfaces/jwt-payload.interface';

function hasRole(user: JwtPayload, ...levels: RoleLevel[]): boolean {
  return Array.isArray(user.roles) && user.roles.some((r: any) => levels.includes(r?.level));
}

@Injectable()
export class CoordenacaoService {
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

    // Professores veem apenas reuniões publicadas da sua unidade
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
      include: {
        participantes: true,
        atas: true,
      },
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

  // ─── DASHBOARD UNIDADE ────────────────────────────────────────────────────

  async getDashboardUnidade(user: JwtPayload) {
    if (!user?.mantenedoraId || !user?.unitId) throw new ForbiddenException('Escopo inválido');

    const unitId = user.unitId;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const startOfWeek = new Date(today);
    const dayOfWeek = today.getDay();
    const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    startOfWeek.setDate(today.getDate() + diff);

    const [
      turmas,
      requisicoesPendentes,
      planejamentosRascunho,
      planejamentosPublicados,
      diariosHoje,
      reunioesAgendadas,
      chamadaHoje,
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
      this.prisma.materialRequest.count({
        where: { unitId, status: RequestStatus.SOLICITADO },
      }),
      this.prisma.planning.count({
        where: { unitId, status: PlanningStatus.RASCUNHO },
      }),
      this.prisma.planning.count({
        where: { unitId, status: PlanningStatus.PUBLICADO },
      }),
      this.prisma.diaryEvent.count({
        where: { unitId, eventDate: { gte: today } },
      }),
      this.prisma.coordenacaoReuniao.count({
        where: {
          mantenedoraId: user.mantenedoraId,
          unitId,
          status: 'AGENDADA',
          dataRealizacao: { gte: today },
        },
      }),
      this.prisma.attendance.count({
        where: { unitId, date: today },
      }),
    ]);

    const totalAlunos = turmas.reduce((sum, t) => sum + t.enrollments.length, 0);

    // Turmas com chamada feita hoje
    const turmasComChamada = await this.prisma.attendance.groupBy({
      by: ['classroomId'],
      where: { unitId, date: today },
    });

    // Requisições por status
    const requisicoesDetalhes = await this.prisma.materialRequest.findMany({
      where: { unitId, status: RequestStatus.SOLICITADO },
      select: {
        id: true,
        title: true,
        createdBy: true,
        requestedDate: true,
        classroomId: true,
        priority: true,
      },
      orderBy: { requestedDate: 'desc' },
      take: 20,
    });

    // Planejamentos aguardando revisão
    const planejamentosRevisao = await this.prisma.planning.findMany({
      where: { unitId, status: PlanningStatus.RASCUNHO },
      select: {
        id: true,
        title: true,
        createdBy: true,
        startDate: true,
        endDate: true,
        classroomId: true,
      },
      orderBy: { startDate: 'asc' },
      take: 20,
    });

    // Próximas reuniões
    const proximasReunioes = await this.prisma.coordenacaoReuniao.findMany({
      where: {
        mantenedoraId: user.mantenedoraId,
        unitId,
        dataRealizacao: { gte: today },
      },
      orderBy: { dataRealizacao: 'asc' },
      take: 5,
    });

    return {
      unitId,
      data: today.toISOString(),
      indicadores: {
        totalTurmas: turmas.length,
        totalAlunos,
        requisicoesPendentes,
        planejamentosRascunho,
        planejamentosPublicados,
        diariosHoje,
        turmasComChamadaHoje: turmasComChamada.length,
        reunioesAgendadas,
      },
      turmas: turmas.map((t) => ({
        id: t.id,
        nome: t.name,
        totalAlunos: t.enrollments.length,
        professor: t.teachers[0]?.teacher
          ? `${t.teachers[0].teacher.firstName} ${t.teachers[0].teacher.lastName}`
          : 'Não atribuído',
        chamadaFeita: turmasComChamada.some((c) => c.classroomId === t.id),
      })),
      requisicoesPendentesDetalhes: requisicoesDetalhes,
      planejamentosParaRevisao: planejamentosRevisao,
      proximasReunioes,
    };
  }

  // ─── DASHBOARD GERAL ──────────────────────────────────────────────────────

  async getDashboardGeral(user: JwtPayload) {
    if (!user?.mantenedoraId) throw new ForbiddenException('Escopo inválido');

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [
      unidades,
      totalAlunos,
      totalProfessores,
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
      this.prisma.child.count({
        where: { enrollments: { some: { classroom: { unit: { mantenedoraId: user.mantenedoraId } } } } },
      }),
      this.prisma.classroomTeacher.count({
        where: { classroom: { unit: { mantenedoraId: user.mantenedoraId } } },
      }),
      this.prisma.materialRequest.count({
        where: { mantenedoraId: user.mantenedoraId, status: RequestStatus.SOLICITADO },
      }),
      this.prisma.planning.count({
        where: { mantenedoraId: user.mantenedoraId, status: PlanningStatus.RASCUNHO },
      }),
      this.prisma.diaryEvent.count({
        where: { mantenedoraId: user.mantenedoraId, eventDate: { gte: today } },
      }),
      this.prisma.coordenacaoReuniao.count({
        where: {
          mantenedoraId: user.mantenedoraId,
          status: 'AGENDADA',
          dataRealizacao: { gte: today },
        },
      }),
    ]);

    // Consolidado por unidade
    const consolidadoUnidades = await Promise.all(
      unidades.map(async (unidade) => {
        const [reqPendentes, planRascunho, diariosUnidade, chamadaUnidade] = await Promise.all([
          this.prisma.materialRequest.count({
            where: { unitId: unidade.id, status: RequestStatus.SOLICITADO },
          }),
          this.prisma.planning.count({
            where: { unitId: unidade.id, status: PlanningStatus.RASCUNHO },
          }),
          this.prisma.diaryEvent.count({
            where: { unitId: unidade.id, eventDate: { gte: today } },
          }),
          this.prisma.attendance.groupBy({
            by: ['classroomId'],
            where: { unitId: unidade.id, date: today },
          }),
        ]);

        const totalAlunosUnidade = unidade.classrooms.reduce((sum, c) => sum + c.enrollments.length, 0);
        const professoresUnidade = new Set(
          unidade.classrooms.flatMap((c) => c.teachers.map((ct) => ct.teacherId)),
        ).size;

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

    // Últimas reuniões de rede
    const ultimasReunioes = await this.prisma.coordenacaoReuniao.findMany({
      where: {
        mantenedoraId: user.mantenedoraId,
        tipo: 'REDE',
      },
      orderBy: { dataRealizacao: 'desc' },
      take: 5,
    });

    // Próximas reuniões
    const proximasReunioes = await this.prisma.coordenacaoReuniao.findMany({
      where: {
        mantenedoraId: user.mantenedoraId,
        dataRealizacao: { gte: today },
        status: 'AGENDADA',
      },
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
  }

  // ─── PLANEJAMENTOS ────────────────────────────────────────────────────────

  async listarPlanejamentos(status: string, classroomId: string, user: JwtPayload) {
    if (!user?.mantenedoraId || !user?.unitId) throw new ForbiddenException('Escopo inválido');

    const where: any = { unitId: user.unitId };
    if (status) where.status = status;
    if (classroomId) where.classroomId = classroomId;

    return this.prisma.planning.findMany({
      where,
      include: {
        classroom: { select: { id: true, name: true } },
      },
      orderBy: { startDate: 'desc' },
      take: 100,
    });
  }

  async aprovarPlanejamento(id: string, dto: any, user: JwtPayload) {
    const planning = await this.prisma.planning.findUnique({ where: { id } });
    if (!planning) throw new NotFoundException('Planejamento não encontrado');
    if (planning.unitId !== user.unitId) throw new ForbiddenException('Fora do escopo');

    const novoStatus = dto.aprovar ? PlanningStatus.PUBLICADO : PlanningStatus.RASCUNHO;

    return this.prisma.planning.update({
      where: { id },
      data: {
        status: novoStatus,
        updatedAt: new Date(),
      },
    });
  }

  // ─── DIÁRIOS ──────────────────────────────────────────────────────────────

  async listarDiarios(classroomId: string, startDate: string, endDate: string, user: JwtPayload) {
    if (!user?.mantenedoraId || !user?.unitId) throw new ForbiddenException('Escopo inválido');

    const where: any = { unitId: user.unitId };
    if (classroomId) where.classroomId = classroomId;
    if (startDate && endDate) {
      where.eventDate = {
        gte: new Date(startDate),
        lte: new Date(endDate),
      };
    } else {
      // Padrão: última semana
      const end = new Date();
      const start = new Date();
      start.setDate(start.getDate() - 7);
      where.eventDate = { gte: start, lte: end };
    }

    return this.prisma.diaryEvent.findMany({
      where,
      include: {
        classroom: { select: { id: true, name: true } },
        child: { select: { id: true, firstName: true, lastName: true } },
      },
      orderBy: { eventDate: 'desc' },
      take: 200,
    });
  }

  // ─── REQUISIÇÕES ──────────────────────────────────────────────────────────

  async listarRequisicoes(status: string, user: JwtPayload) {
    if (!user?.mantenedoraId || !user?.unitId) throw new ForbiddenException('Escopo inválido');

    const where: any = { unitId: user.unitId };
    if (status) where.status = status;
    else where.status = RequestStatus.SOLICITADO;

    return this.prisma.materialRequest.findMany({
      where,
      orderBy: { requestedDate: 'desc' },
      take: 100,
    });
  }
}
