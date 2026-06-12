import { ForbiddenException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RoleLevel } from '@prisma/client';
import type { JwtPayload } from '../auth/interfaces/jwt-payload.interface';

function canAccessUnitInternal(user: JwtPayload, unitId: string): boolean {
  if (!unitId) return false;
  const isCentral = Array.isArray(user.roles) && user.roles.some((r: any) =>
    ['STAFF_CENTRAL', 'MANTENEDORA', 'DEVELOPER'].includes(r?.level)
  );
  if (isCentral) return true;
  return user.unitId === unitId;
}

/** Verifica se o usuário tem role central (STAFF_CENTRAL, MANTENEDORA ou DEVELOPER) */
function isCentralRole(user: JwtPayload): boolean {
  return (
    Array.isArray(user.roles) &&
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    user.roles.some((r: any) =>
      r?.level === RoleLevel.STAFF_CENTRAL ||
      r?.level === RoleLevel.MANTENEDORA ||
      r?.level === RoleLevel.DEVELOPER,
    )
  );
}

/** Resolve o filtro de unitId para queries:
 *  - UNIDADE: força token.unitId
 *  - CENTRAL sem unitId: null (rede inteira, filtrar por mantenedoraId)
 *  - CENTRAL com unitId: valida e usa unitId fornecido
 */
function resolveUnitScope(
  user: JwtPayload,
  unitIdParam?: string,
): { unitId: string | null; mantenedoraId: string } {
  if (!user.mantenedoraId) throw new ForbiddenException('Escopo inválido');
  if (isCentralRole(user)) {
    return { unitId: unitIdParam || null, mantenedoraId: user.mantenedoraId };
  }
  if (!user.unitId) throw new ForbiddenException('Escopo inválido');
  return { unitId: user.unitId, mantenedoraId: user.mantenedoraId };
}

@Injectable()
export class InsightsService {
  constructor(private prisma: PrismaService) {}

  /**
   * GET /insights/teacher/today
   * Retorna o resumo do dia para o professor autenticado:
   * - Planejamento ativo para hoje (se houver)
   * - Objetivos da Matriz para hoje (via planning.description V2)
   * - Contagem de presenças do dia
   * - Próximo evento de diário
   * - Alertas (planejamentos em rascunho antigos)
   */
  async getTeacherToday(user: JwtPayload) {
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0]; // YYYY-MM-DD
    const startOfDay = new Date(todayStr + 'T00:00:00-03:00');
    const endOfDay = new Date(todayStr + 'T23:59:59-03:00');

    // 1. Buscar planejamento ativo para hoje
    const planning = await this.prisma.planning.findFirst({
      where: {
        createdBy: user.sub,
        startDate: { lte: endOfDay },
        endDate: { gte: startOfDay },
        status: { in: ['APROVADO', 'EM_REVISAO', 'RASCUNHO'] },
      },
      orderBy: { startDate: 'desc' },
      select: {
        id: true,
        title: true,
        status: true,
        description: true,
        startDate: true,
        endDate: true,
        classroomId: true,
        classroom: {
          select: { id: true, name: true, ageGroupMin: true, ageGroupMax: true },
        },
      },
    });

    // 2. Extrair objetivos do dia de hoje do planning V2
    let objetivosHoje: any[] = [];
    if (planning?.description) {
      try {
        const v2 = JSON.parse(planning.description);
        if (v2?.version === 2 && Array.isArray(v2.days)) {
          const dayData = v2.days.find((d: any) => d.date === todayStr);
          if (dayData?.objectives) {
            objetivosHoje = dayData.objectives;
          }
        }
      } catch {
        // description não é JSON V2, ignorar
      }
    }

    // 3. Contagem de presenças hoje via ClassroomTeacher
    const classroomTeachers = await this.prisma.classroomTeacher.findMany({
      where: { teacherId: user.sub },
      select: { classroomId: true, classroom: { select: { name: true } } },
    });
    const classroomIds = classroomTeachers.map(ct => ct.classroomId);

    let presenca: { turma: string; presentes: number; ausentes: number; total: number } | null = null;
    if (classroomIds.length > 0) {
      const [presentes, ausentes] = await Promise.all([
        this.prisma.attendance.count({
          where: {
            classroomId: { in: classroomIds },
            date: { gte: startOfDay, lte: endOfDay },
            status: 'PRESENTE',
          },
        }),
        this.prisma.attendance.count({
          where: {
            classroomId: { in: classroomIds },
            date: { gte: startOfDay, lte: endOfDay },
            status: { not: 'PRESENTE' },
          },
        }),
      ]);
      const turmaNome = classroomTeachers[0]?.classroom?.name ?? '';
      presenca = {
        turma: turmaNome,
        presentes,
        ausentes,
        total: presentes + ausentes,
      };
    }

    // 4. Próximo evento de diário para hoje
    const proximoEvento = await this.prisma.diaryEvent.findFirst({
      where: {
        createdBy: user.sub,
        eventDate: { gte: startOfDay, lte: endOfDay },
      },
      orderBy: { eventDate: 'asc' },
      select: {
        id: true,
        title: true,
        eventDate: true,
        curriculumEntryId: true,
      },
    });

    // 5. Planejamentos pendentes de envio (RASCUNHO há mais de 2 dias)
    const twoDaysAgo = new Date();
    twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);
    const planejamentosPendentes = await this.prisma.planning.count({
      where: {
        createdBy: user.sub,
        status: 'RASCUNHO',
        createdAt: { lte: twoDaysAgo },
      },
    });

    return {
      date: todayStr,
      diaSemana: today.toLocaleDateString('pt-BR', {
        weekday: 'long',
        timeZone: 'America/Sao_Paulo',
      }),
      planejamentoAtivo: planning
        ? {
            id: planning.id,
            title: planning.title,
            status: planning.status,
            turma: (planning as any).classroom?.name ?? null,
            objetivosHoje,
          }
        : null,
      presenca,
      proximoEvento: proximoEvento
        ? {
            id: proximoEvento.id,
            title: proximoEvento.title,
            horario: proximoEvento.eventDate,
          }
        : null,
      alertas: {
        planejamentosPendentes,
      },
    };
  }

  // ─────────────────────────────────────────────────────────────────────────
  // GOVERNANÇA PEDAGÓGICA
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * GET /insights/governance/funnel?unitId=&startDate=&endDate=
   *
   * Funil pedagógico: contagem de planejamentos por etapa do fluxo.
   * Usa dados existentes da tabela Planning (sem migrations).
   *
   * RBAC:
   *   UNIDADE: força token.unitId
   *   STAFF_CENTRAL/MANTENEDORA/DEVELOPER: unitId opcional (null = rede inteira)
   *
   * Retorna: { created, submitted, approved, executed, scope }
   */
  async getGovernanceFunnel(
    user: JwtPayload,
    params: { unitId?: string; startDate?: string; endDate?: string },
  ) {
    const { unitId, mantenedoraId } = resolveUnitScope(user, params.unitId);

    const dateFilter: Record<string, Date> = {};
    if (params.startDate) dateFilter.gte = new Date(params.startDate + 'T00:00:00-03:00');
    if (params.endDate) dateFilter.lte = new Date(params.endDate + 'T23:59:59-03:00');

    const baseWhere: Record<string, unknown> = { mantenedoraId };
    if (unitId) baseWhere.unitId = unitId;
    if (Object.keys(dateFilter).length > 0) baseWhere.createdAt = dateFilter;

    // Contagens paralelas por status do funil
    const [created, submitted, approved, executed] = await Promise.all([
      // Criados: todos os planejamentos no período
      this.prisma.planning.count({ where: baseWhere as any }),
      // Enviados para revisão: status EM_REVISAO ou posterior
      this.prisma.planning.count({
        where: {
          ...baseWhere,
          status: { in: ['EM_REVISAO', 'APROVADO', 'DEVOLVIDO'] },
        } as any,
      }),
      // Aprovados: status APROVADO
      this.prisma.planning.count({
        where: { ...baseWhere, status: 'APROVADO' } as any,
      }),
      // Executados: DiaryEvents vinculados a um planningId no mesmo escopo/período
      this.prisma.diaryEvent.count({
        where: {
          mantenedoraId,
          ...(unitId ? { unitId } : {}),
          planningId: { not: null },
          ...(Object.keys(dateFilter).length > 0 ? { eventDate: dateFilter } : {}),
        } as any,
      }),
    ]);

    return {
      scope: unitId ? 'unit' : 'network',
      unitId: unitId || null,
      periodo: {
        inicio: params.startDate || null,
        fim: params.endDate || null,
      },
      funnel: { created, submitted, approved, executed },
    };
  }

  /**
   * GET /insights/governance/coverage?unitId=&startDate=&endDate=
   *
   * Cobertura BNCC por campo de experiência (heatmap).
   * Usa DiaryEvent.curriculumEntryId → CurriculumMatrixEntry.campoDeExperiencia
   * (sem migrations — dados já existem no schema).
   *
   * RBAC:
   *   UNIDADE: força token.unitId
   *   STAFF_CENTRAL/MANTENEDORA/DEVELOPER: unitId opcional (null = rede inteira)
   *
   * Retorna:
   *   { scope, units: [{unitId, unitName}], coverage: [{key, label, perUnit, network}] }
   */
  async getGovernanceCoverage(
    user: JwtPayload,
    params: { unitId?: string; startDate?: string; endDate?: string },
  ) {
    const { unitId, mantenedoraId } = resolveUnitScope(user, params.unitId);

    const dateFilter: Record<string, Date> = {};
    if (params.startDate) dateFilter.gte = new Date(params.startDate + 'T00:00:00-03:00');
    if (params.endDate) dateFilter.lte = new Date(params.endDate + 'T23:59:59-03:00');

    // Buscar DiaryEvents com curriculumEntry (que tem campoDeExperiencia)
    const events = await this.prisma.diaryEvent.findMany({
      where: {
        mantenedoraId,
        ...(unitId ? { unitId } : {}),
        curriculumEntryId: { not: null },
        ...(Object.keys(dateFilter).length > 0 ? { eventDate: dateFilter } : {}),
      } as any,
      select: {
        unitId: true,
        curriculumEntry: {
          select: { campoDeExperiencia: true },
        },
      },
    });

    // Buscar unidades da mantenedora para o heatmap
    const unidades = await this.prisma.unit.findMany({
      where: {
        mantenedoraId,
        isActive: true,
        ...(unitId ? { id: unitId } : {}),
      },
      select: { id: true, name: true },
      orderBy: { name: 'asc' },
    });

    // Labels dos campos de experiência
    const CAMPO_LABELS: Record<string, string> = {
      O_EU_O_OUTRO_E_O_NOS: 'O Eu, o Outro e o Nós',
      CORPO_GESTOS_E_MOVIMENTOS: 'Corpo, Gestos e Movimentos',
      TRACOS_SONS_CORES_E_FORMAS: 'Traços, Sons, Cores e Formas',
      ESCUTA_FALA_PENSAMENTO_E_IMAGINACAO: 'Escuta, Fala, Pensamento e Imaginação',
      ESPACOS_TEMPOS_QUANTIDADES_RELACOES_E_TRANSFORMACOES: 'Espaços, Tempos, Quantidades, Relações e Transformações',
    };

    // Contar eventos por campo e por unidade
    const countByUnitAndCampo: Record<string, Record<string, number>> = {};
    const totalByUnitId: Record<string, number> = {};
    const totalByCampo: Record<string, number> = {};
    let totalGeral = 0;

    for (const e of events) {
      const campo = (e as any).curriculumEntry?.campoDeExperiencia;
      if (!campo || !e.unitId) continue;
      if (!countByUnitAndCampo[e.unitId]) countByUnitAndCampo[e.unitId] = {};
      countByUnitAndCampo[e.unitId][campo] = (countByUnitAndCampo[e.unitId][campo] || 0) + 1;
      totalByUnitId[e.unitId] = (totalByUnitId[e.unitId] || 0) + 1;
      totalByCampo[campo] = (totalByCampo[campo] || 0) + 1;
      totalGeral++;
    }

    const campos = Object.keys(CAMPO_LABELS);
    const coverage = campos.map(key => {
      const perUnit: Record<string, number> = {};
      for (const u of unidades) {
        const count = countByUnitAndCampo[u.id]?.[key] || 0;
        const total = totalByUnitId[u.id] || 0;
        perUnit[u.id] = total > 0 ? Math.round((count / total) * 100) / 100 : 0;
      }
      const networkCount = totalByCampo[key] || 0;
      const networkPct = totalGeral > 0 ? Math.round((networkCount / totalGeral) * 100) / 100 : 0;
      return {
        key,
        label: CAMPO_LABELS[key],
        count: networkCount,
        network: networkPct,
        perUnit,
      };
    });

    return {
      scope: unitId ? 'unit' : 'network',
      unitId: unitId || null,
      periodo: {
        inicio: params.startDate || null,
        fim: params.endDate || null,
      },
      totalEventos: totalGeral,
      units: unidades.map(u => ({ unitId: u.id, unitName: u.name })),
      coverage,
    };
  }

  /**
   * GET /insights/unit/alerts
   * Alertas operacionais ativos para a unidade (lê AlertaOperacional do banco).
   */
  async getUnitAlerts(user: JwtPayload, unitIdOverride?: string) {
    if (!user?.mantenedoraId) throw new ForbiddenException('Escopo inválido');
    const { unitId, mantenedoraId } = resolveUnitScope(user, unitIdOverride);

    const alertas = await this.prisma.alertaOperacional.findMany({
      where: {
        mantenedoraId,
        ...(unitId ? { unitId } : {}),
        resolvido: false,
      },
      orderBy: [{ severidade: 'desc' }, { criadoEm: 'desc' }],
      take: 30,
      select: {
        id: true,
        tipo: true,
        severidade: true,
        titulo: true,
        descricao: true,
        unitId: true,
        classroomId: true,
        childId: true,
        criadoEm: true,
        metadados: true,
      },
    });

    const mapNivel = (s: string) =>
      s === 'CRITICA' || s === 'ALTA' ? 'critico' : s === 'MEDIA' ? 'atencao' : 'info';

    const resultado = alertas.map((a) => ({
      id: a.id,
      tipo: a.tipo,
      nivel: mapNivel(a.severidade as string),
      titulo: a.titulo,
      descricao: a.descricao,
      classroomId: a.classroomId,
      childId: a.childId,
      criadoEm: a.criadoEm,
    }));

    return {
      unitId: unitId ?? null,
      total: resultado.length,
      criticos: resultado.filter((a) => a.nivel === 'critico'),
      atencao: resultado.filter((a) => a.nivel === 'atencao'),
      info: resultado.filter((a) => a.nivel === 'info'),
    };
  }

  /**
   * GET /insights/classroom/score
   * Score pedagógico de 0-100 de uma turma em um mês.
   * Dimensões: diários (30%) + planejamento (25%) + chamada (25%) + rdic (20%)
   */
  async getClassroomScore(classroomId: string, mes: string, user: JwtPayload) {
    if (!user?.mantenedoraId) throw new ForbiddenException('Escopo inválido');

    const classroom = await this.prisma.classroom.findUnique({
      where: { id: classroomId },
      select: { id: true, name: true, unitId: true },
    });
    if (!classroom) throw new ForbiddenException('Turma não encontrada');
    if (!canAccessUnitInternal(user, classroom.unitId)) {
      throw new ForbiddenException('Acesso não autorizado a esta turma');
    }

    const [ano, mesNum] = mes.split('-').map(Number);
    const inicioMes = new Date(ano, mesNum - 1, 1);
    const fimMes = new Date(ano, mesNum, 0, 23, 59, 59, 999);
    const hoje = new Date();
    const fimEfetivo = fimMes < hoje ? fimMes : hoje;

    const [
      totalDiariosPublicados,
      totalDiariosRascunho,
      totalPlanejamentos,
      planejamentosExecutados,
      totalChamadas,
      rdicStatus,
      enrollments,
    ] = await Promise.all([
      this.prisma.diaryEvent.count({
        where: {
          classroomId,
          status: { in: ['PUBLICADO', 'REVISADO', 'ARQUIVADO'] as any[] },
          eventDate: { gte: inicioMes, lte: fimEfetivo },
        },
      }),
      this.prisma.diaryEvent.count({
        where: {
          classroomId,
          status: 'RASCUNHO' as any,
          eventDate: { gte: inicioMes, lte: fimEfetivo },
        },
      }),
      this.prisma.planning.count({
        where: {
          classroomId,
          startDate: { gte: inicioMes, lte: fimEfetivo },
        },
      }),
      this.prisma.diaryEvent.count({
        where: {
          classroomId,
          planningId: { not: null },
          eventDate: { gte: inicioMes, lte: fimEfetivo },
        },
      }),
      this.prisma.attendance.groupBy({
        by: ['date'],
        where: {
          classroomId,
          date: { gte: inicioMes, lte: fimEfetivo },
        },
      }),
      this.prisma.rDIXInstancia.findMany({
        where: { classroomId, anoLetivo: ano } as any,
        select: { status: true },
      }),
      this.prisma.enrollment.count({
        where: { classroomId, status: 'ATIVA' } as any,
      }),
    ]);

    let diasLetivos = 0;
    const cursor = new Date(inicioMes);
    while (cursor <= fimEfetivo) {
      const dow = cursor.getDay();
      if (dow !== 0 && dow !== 6) diasLetivos++;
      cursor.setDate(cursor.getDate() + 1);
    }

    const pctDiarios = diasLetivos > 0
      ? Math.min(100, Math.round((totalDiariosPublicados / diasLetivos) * 100))
      : 0;

    const pctPlanejamento = totalPlanejamentos > 0
      ? Math.min(100, Math.round((planejamentosExecutados / totalPlanejamentos) * 100))
      : totalPlanejamentos === 0 ? 0 : 0;

    const pctChamada = diasLetivos > 0
      ? Math.min(100, Math.round((totalChamadas.length / diasLetivos) * 100))
      : 0;

    const rdicTotal = enrollments;
    const rdicIniciados = rdicStatus.filter(
      (r: any) => !['PENDENTE', 'RASCUNHO'].includes(r.status)
    ).length;
    const pctRdic = rdicTotal > 0
      ? Math.min(100, Math.round((rdicIniciados / rdicTotal) * 100))
      : 0;

    const score = Math.round(
      pctDiarios * 0.30 +
      pctPlanejamento * 0.25 +
      pctChamada * 0.25 +
      pctRdic * 0.20
    );

    const alertas: string[] = [];
    if (pctChamada < 80) alertas.push(`Chamada abaixo de 80% no mês (${pctChamada}%)`);
    if (pctDiarios < 60) alertas.push('Diários publicados abaixo de 60% dos dias letivos');
    if (totalPlanejamentos === 0) alertas.push('Nenhum planejamento criado no mês');
    if (pctRdic < 30 && mesNum >= 4) alertas.push(`RDIC com apenas ${pctRdic}% iniciado`);

    return {
      classroomId,
      classroomName: classroom.name,
      mes,
      score,
      dimensoes: {
        diarios: { publicados: totalDiariosPublicados, rascunhos: totalDiariosRascunho, diasLetivos, pct: pctDiarios },
        planejamento: { criados: totalPlanejamentos, executados: planejamentosExecutados, pct: pctPlanejamento },
        chamada: { diasComChamada: totalChamadas.length, diasLetivos, pct: pctChamada },
        rdic: { iniciados: rdicIniciados, total: rdicTotal, pct: pctRdic },
      },
      alertas,
    };
  }

  /**
   * GET /insights/child/:childId/summary
   * Camada somente leitura para análise da criança.
   *
   * Regras de integridade:
   * - não altera matriz curricular;
   * - não altera planos de aula;
   * - não altera diário/RDIC/observações existentes;
   * - não cria migrations;
   * - não grava dados.
   */
  async getChildSummary(childId: string, user: JwtPayload) {
    if (!childId) throw new ForbiddenException('Criança inválida');
    if (!user?.mantenedoraId) throw new ForbiddenException('Escopo inválido');

    const child = await this.prisma.child.findFirst({
      where: {
        id: childId,
        mantenedoraId: user.mantenedoraId,
        isActive: true,
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        dateOfBirth: true,
        unitId: true,
        mantenedoraId: true,
        allergies: true,
        medicalConditions: true,
        medicationNeeds: true,
        enrollments: {
          where: { status: 'ATIVA' },
          orderBy: { enrollmentDate: 'desc' },
          take: 1,
          select: {
            id: true,
            classroomId: true,
            classroom: { select: { id: true, name: true } },
          },
        },
      },
    });

    if (!child) throw new ForbiddenException('Criança não encontrada no escopo permitido');

    const activeEnrollment = child.enrollments?.[0] ?? null;
    const classroomId = activeEnrollment?.classroomId ?? null;
    const userRoles = Array.isArray(user.roles) ? user.roles : [];
    const roleLevels = userRoles.map((role) => role.level);
    const hasCentralAccess = roleLevels.some((level) =>
      ([RoleLevel.DEVELOPER, RoleLevel.MANTENEDORA, RoleLevel.STAFF_CENTRAL] as RoleLevel[]).includes(level),
    );
    const hasUnitAccess = roleLevels.includes(RoleLevel.UNIDADE);
    const hasTeacherAccess = roleLevels.includes(RoleLevel.PROFESSOR);

    if (hasCentralAccess) {
      const scopedUnits = userRoles.flatMap((role) => role.unitScopes ?? []);
      if (scopedUnits.length > 0 && !scopedUnits.includes(child.unitId)) {
        throw new ForbiddenException('Usuário sem acesso à unidade da criança');
      }
    } else if (hasUnitAccess) {
      if (!user.unitId || user.unitId !== child.unitId) {
        throw new ForbiddenException('Usuário sem acesso à unidade da criança');
      }
    } else if (hasTeacherAccess) {
      if (!classroomId) throw new ForbiddenException('Criança sem turma ativa para validação do professor');
      const link = await this.prisma.classroomTeacher.findFirst({
        where: {
          classroomId,
          teacherId: user.sub,
          isActive: true,
        },
        select: { id: true },
      });
      if (!link) throw new ForbiddenException('Professor sem vínculo com a turma da criança');
    } else {
      throw new ForbiddenException('Perfil sem acesso ao resumo da criança');
    }

    const now = new Date();
    const since30 = new Date(now);
    since30.setDate(since30.getDate() - 30);

    const [diaryEvents, observations, rdics, attendance30, dietaryRestrictions, openAlerts] = await Promise.all([
      this.prisma.diaryEvent.findMany({
        where: {
          childId,
          mantenedoraId: user.mantenedoraId,
          unitId: child.unitId,
        },
        orderBy: { eventDate: 'desc' },
        take: 200,
        select: {
          id: true,
          type: true,
          title: true,
          description: true,
          observations: true,
          developmentNotes: true,
          behaviorNotes: true,
          eventDate: true,
          status: true,
          createdAt: true,
        },
      }),
      this.prisma.developmentObservation.findMany({
        where: { childId },
        orderBy: { date: 'desc' },
        take: 200,
        select: {
          id: true,
          category: true,
          date: true,
          behaviorDescription: true,
          socialInteraction: true,
          emotionalState: true,
          motorSkills: true,
          cognitiveSkills: true,
          languageSkills: true,
          learningProgress: true,
          developmentAlerts: true,
          recommendations: true,
          nextSteps: true,
          createdAt: true,
        },
      }),
      this.prisma.rDIXInstancia.findMany({
        where: {
          childId,
          mantenedoraId: user.mantenedoraId,
          unitId: child.unitId,
        },
        orderBy: { criadoEm: 'desc' },
        take: 50,
        select: {
          id: true,
          periodo: true,
          periodoEnum: true,
          anoLetivo: true,
          status: true,
          submittedAt: true,
          reviewedAt: true,
          finalizadoEm: true,
          publicadoEm: true,
          criadoEm: true,
          atualizadoEm: true,
        },
      }),
      this.prisma.attendance.findMany({
        where: {
          childId,
          mantenedoraId: user.mantenedoraId,
          unitId: child.unitId,
          date: { gte: since30, lte: now },
        },
        orderBy: { date: 'desc' },
        select: {
          id: true,
          date: true,
          status: true,
          justification: true,
        },
      }),
      this.prisma.dietaryRestriction.findMany({
        where: { childId, isActive: true },
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          type: true,
          name: true,
          description: true,
          severity: true,
          forbiddenFoods: true,
        },
      }),
      this.prisma.alertaOperacional.findMany({
        where: {
          childId,
          mantenedoraId: user.mantenedoraId,
          resolvido: false,
        },
        orderBy: { criadoEm: 'desc' },
        take: 20,
        select: {
          id: true,
          tipo: true,
          severidade: true,
          titulo: true,
          descricao: true,
          criadoEm: true,
        },
      }),
    ]);

    const attendanceTotal = attendance30.length;
    const presentes = attendance30.filter((item) => item.status === 'PRESENTE').length;
    const ausentes = attendance30.filter((item) => item.status === 'AUSENTE').length;
    const justificados = attendance30.filter((item) => item.status === 'JUSTIFICADO').length;
    const atrasos = attendance30.filter((item) => item.status === 'ATRASO').length;
    const presencaPercentual = attendanceTotal > 0 ? Math.round((presentes / attendanceTotal) * 100) : null;

    const observationsWithAlerts = observations.filter((item) =>
      Boolean(item.developmentAlerts && item.developmentAlerts.trim().length > 0),
    );

    const pontosAtencao: Array<{ tipo: string; severidade: string; titulo: string; descricao: string }> = [];

    if (observationsWithAlerts.length > 0) {
      pontosAtencao.push({
        tipo: 'DESENVOLVIMENTO',
        severidade: observationsWithAlerts.length >= 3 ? 'ALTA' : 'MEDIA',
        titulo: `${observationsWithAlerts.length} observação(ões) com alerta de desenvolvimento`,
        descricao: 'Revisar registros recentes com coordenação ou psicologia antes de qualquer encaminhamento.',
      });
    }

    if (presencaPercentual !== null && presencaPercentual < 80) {
      pontosAtencao.push({
        tipo: 'FREQUENCIA',
        severidade: presencaPercentual < 60 ? 'ALTA' : 'MEDIA',
        titulo: `Presença em ${presencaPercentual}% nos últimos 30 dias registrados`,
        descricao: 'Acompanhar justificativas e comunicação com responsáveis.',
      });
    }

    if (dietaryRestrictions.length > 0 || child.allergies || child.medicalConditions || child.medicationNeeds) {
      pontosAtencao.push({
        tipo: 'SAUDE_NUTRICAO',
        severidade: dietaryRestrictions.some((item) => String(item.severity ?? '').toLowerCase().includes('sever')) ? 'ALTA' : 'MEDIA',
        titulo: 'Atenção de saúde/nutrição cadastrada',
        descricao: 'Conferir restrições, alergias e observações de saúde antes de atividades e refeições.',
      });
    }

    for (const alerta of openAlerts.slice(0, 5)) {
      pontosAtencao.push({
        tipo: String(alerta.tipo),
        severidade: String(alerta.severidade),
        titulo: alerta.titulo,
        descricao: alerta.descricao,
      });
    }

    const timeline = [
      ...diaryEvents.map((item) => ({
        id: item.id,
        type: 'DIARIO',
        date: item.eventDate,
        title: item.title || String(item.type).replace(/_/g, ' '),
        description: item.description || item.observations || item.developmentNotes || item.behaviorNotes || '',
        status: item.status,
        source: 'DiaryEvent',
      })),
      ...observations.map((item) => ({
        id: item.id,
        type: 'OBSERVACAO',
        date: item.date,
        title: String(item.category || 'GERAL').replace(/_/g, ' '),
        description:
          item.behaviorDescription ||
          item.learningProgress ||
          item.socialInteraction ||
          item.emotionalState ||
          item.motorSkills ||
          item.cognitiveSkills ||
          item.languageSkills ||
          '',
        alert: item.developmentAlerts || '',
        recommendation: item.recommendations || item.nextSteps || '',
        source: 'DevelopmentObservation',
      })),
      ...rdics.map((item) => ({
        id: item.id,
        type: 'RDIC',
        date: item.publicadoEm || item.finalizadoEm || item.reviewedAt || item.submittedAt || item.criadoEm || item.atualizadoEm,
        title: `RDIC ${item.periodoEnum || item.periodo || ''}`.trim(),
        description: `Status: ${item.status}`,
        status: item.status,
        source: 'RDIXInstancia',
      })),
      ...openAlerts.map((item) => ({
        id: item.id,
        type: 'ALERTA',
        date: item.criadoEm,
        title: item.titulo,
        description: item.descricao,
        alert: item.descricao,
        status: item.severidade,
        source: 'AlertaOperacional',
      })),
    ].sort((a, b) => new Date(b.date as any).getTime() - new Date(a.date as any).getTime());

    return {
      child: {
        id: child.id,
        firstName: child.firstName,
        lastName: child.lastName,
        name: `${child.firstName} ${child.lastName}`.trim(),
        dateOfBirth: child.dateOfBirth,
        unitId: child.unitId,
        classroomId,
        classroomName: activeEnrollment?.classroom?.name ?? null,
        health: {
          allergies: child.allergies,
          medicalConditions: child.medicalConditions,
          medicationNeeds: child.medicationNeeds,
        },
      },
      metrics: {
        diary: diaryEvents.length,
        observations: observations.length,
        observationsWithAlerts: observationsWithAlerts.length,
        rdic: rdics.length,
        openAlerts: openAlerts.length,
        dietaryRestrictions: dietaryRestrictions.length,
        attendance30: {
          total: attendanceTotal,
          presentes,
          ausentes,
          justificados,
          atrasos,
          presencaPercentual,
        },
      },
      attentionPoints: pontosAtencao,
      dietaryRestrictions,
      recent: {
        diary: diaryEvents.slice(0, 5),
        observations: observations.slice(0, 5),
        rdic: rdics.slice(0, 5),
        attendance: attendance30.slice(0, 10),
        alerts: openAlerts.slice(0, 5),
      },
      timeline,
    };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // CENTRO DE MISSÕES INTELIGENTES
  // Gera tarefas acionáveis determinísticas. Somente leitura. Multi-tenant.
  // ═══════════════════════════════════════════════════════════════════════════

  async getMissions(
    user: JwtPayload,
    params: { unitId?: string; classroomId?: string; childId?: string; priority?: string; periodDays?: number },
  ) {
    const { unitId: resolvedUnit, mantenedoraId } = resolveUnitScope(user, params.unitId);
    const periodDays = params.periodDays ?? 14;
    const since = new Date(); since.setDate(since.getDate() - periodDays);
    type Priority = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
    type Mission = { id: string; type: string; title: string; description: string; priority: Priority; profile: string[]; evidence: Array<{ source: string; sourceId?: string; label: string; date?: string; value?: string | number }>; suggestedAction: string; targetRoute?: string; requiresHumanReview: true; generatedAt: string; tenantScope: { mantenedoraId?: string; unitId?: string }; };
    const missions: Mission[] = [];
    const prioOrder: Record<Priority, number> = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3 };
    const tenantWhere = { mantenedoraId, ...(resolvedUnit ? { unitId: resolvedUnit } : {}) };

    const add = (m: Omit<Mission, 'requiresHumanReview' | 'generatedAt' | 'tenantScope'>) => {
      if (params.priority && m.priority !== params.priority) return;
      missions.push({ ...m, requiresHumanReview: true, generatedAt: new Date().toISOString(), tenantScope: { mantenedoraId, unitId: resolvedUnit ?? undefined } });
    };

    // 1. Alertas operacionais abertos
    const alertas = await this.prisma.alertaOperacional.findMany({
      where: { ...tenantWhere, ...(params.classroomId ? { classroomId: params.classroomId } : {}), ...(params.childId ? { childId: params.childId } : {}), resolvido: false },
      orderBy: { criadoEm: 'desc' }, take: 20,
      select: { id: true, tipo: true, titulo: true, severidade: true, criadoEm: true },
    });
    for (const a of alertas) {
      add({ id: `alerta-${a.id}`, type: 'ALERTA_OPERACIONAL', title: a.titulo ?? `Alerta ${a.tipo}`,
        description: `Alerta operacional "${a.tipo}" em aberto.`,
        priority: (a.severidade === 'CRITICA' || a.severidade === 'ALTA') ? 'CRITICAL' : 'HIGH',
        profile: ['COORDENACAO_PEDAGOGICA', 'DIRETOR', 'STAFF_CENTRAL'],
        evidence: [{ source: 'AlertaOperacional', sourceId: a.id, label: a.tipo, date: a.criadoEm?.toISOString() }],
        suggestedAction: 'Revisar e resolver na tela de ocorrências.', targetRoute: '/app/secretaria/ocorrencias' });
    }

    // 2. RDICs pendentes / devolvidos
    const rdics = await this.prisma.rDIXInstancia.findMany({
      where: { ...tenantWhere, ...(params.classroomId ? { classroomId: params.classroomId } : {}), ...(params.childId ? { childId: params.childId } : {}), status: { in: ['RASCUNHO', 'PENDENTE', 'DEVOLVIDO'] } },
      select: { id: true, status: true, periodo: true, anoLetivo: true }, take: 30,
    });
    for (const r of rdics) {
      const dev = r.status === 'DEVOLVIDO';
      add({ id: `rdic-${r.id}`, type: 'RDIC_PENDENTE', title: `RDIC ${dev ? 'devolvido' : 'pendente'}`,
        description: `RDIC ${r.periodo ?? ''} (${r.anoLetivo ?? ''}) — ${r.status}.`,
        priority: dev ? 'HIGH' : 'MEDIUM', profile: ['PROFESSOR', 'COORDENACAO_PEDAGOGICA'],
        evidence: [{ source: 'RDIXInstancia', sourceId: r.id, label: 'Status', value: r.status }],
        suggestedAction: dev ? 'Revisar e reenviar.' : 'Finalizar e publicar.', targetRoute: '/app/rdic' });
    }

    // 3. Baixa frequência (< 75%)
    const [presMap, totalAtt] = await Promise.all([
      this.prisma.attendance.groupBy({ by: ['childId'], where: { ...tenantWhere, ...(params.classroomId ? { classroomId: params.classroomId } : {}), ...(params.childId ? { childId: params.childId } : {}), date: { gte: since }, status: 'P' }, _count: { childId: true } }),
      this.prisma.attendance.groupBy({ by: ['childId'], where: { ...tenantWhere, ...(params.classroomId ? { classroomId: params.classroomId } : {}), ...(params.childId ? { childId: params.childId } : {}), date: { gte: since } }, _count: { childId: true } }),
    ]);
    const pmMap = new Map(presMap.map((a) => [a.childId, a._count.childId]));
    for (const t of totalAtt) {
      if (t._count.childId < 3) continue;
      const taxa = (pmMap.get(t.childId) ?? 0) / t._count.childId;
      if (taxa < 0.75) {
        add({ id: `freq-${t.childId}`, type: 'BAIXA_FREQUENCIA', title: 'Frequência abaixo de 75%',
          description: `Frequência de ${Math.round(taxa * 100)}% nos últimos ${periodDays} dias.`,
          priority: taxa < 0.5 ? 'CRITICAL' : 'HIGH', profile: ['PROFESSOR', 'COORDENACAO_PEDAGOGICA', 'SECRETARIA'],
          evidence: [{ source: 'Attendance', label: 'Taxa', value: `${Math.round(taxa * 100)}%` }],
          suggestedAction: 'Contactar responsável e registrar justificativas.', targetRoute: '/app/secretaria/faltas' });
      }
    }

    // 4. Observações com alertas de desenvolvimento
    const obsAlertas = await this.prisma.developmentObservation.findMany({
      where: { ...(resolvedUnit ? { classroom: { unit: { id: resolvedUnit } } } : {}), ...(params.classroomId ? { classroomId: params.classroomId } : {}), ...(params.childId ? { childId: params.childId } : {}), date: { gte: since }, developmentAlerts: { not: null } },
      select: { id: true, date: true, psychologicalNotes: true }, take: 20,
    });
    for (const o of obsAlertas) {
      const hp = !!o.psychologicalNotes;
      add({ id: `obs-${o.id}`, type: 'OBSERVACAO_DESENVOLVIMENTO', title: 'Alerta de desenvolvimento',
        description: `Observação com indicadores de atenção${hp ? ' e notas psicológicas' : ''}.`,
        priority: hp ? 'HIGH' : 'MEDIUM', profile: hp ? ['PSICOLOGA', 'COORDENACAO_PEDAGOGICA'] : ['COORDENACAO_PEDAGOGICA', 'PROFESSOR'],
        evidence: [{ source: 'DevelopmentObservation', sourceId: o.id, label: 'Alerta', date: o.date?.toISOString() }],
        suggestedAction: hp ? 'Agendar avaliação com equipe de apoio.' : 'Acompanhar evolução.', targetRoute: '/app/observacao-crianca' });
    }

    // 5. Restrições alimentares críticas
    const restricoes = await this.prisma.dietaryRestriction.findMany({
      where: { isActive: true, severity: { in: ['ALTA', 'CRITICA'] }, child: { enrollments: { some: { status: 'ATIVA', classroom: { unit: { mantenedoraId, ...(resolvedUnit ? { id: resolvedUnit } : {}) } } } } }, ...(params.childId ? { childId: params.childId } : {}) },
      select: { id: true, severity: true, description: true }, take: 20,
    });
    for (const r of restricoes) {
      add({ id: `rest-${r.id}`, type: 'RESTRICAO_ALIMENTAR_CRITICA', title: `Restrição alimentar ${r.severity}`,
        description: r.description ?? 'Criança com restrição alimentar de alta severidade.',
        priority: r.severity === 'CRITICA' ? 'CRITICAL' : 'HIGH', profile: ['NUTRICIONISTA', 'PROFESSOR'],
        evidence: [{ source: 'DietaryRestriction', sourceId: r.id, label: 'Severidade', value: r.severity }],
        suggestedAction: 'Verificar cardápio e orientar equipe.', targetRoute: '/app/painel-alergias' });
    }

    missions.sort((a, b) => prioOrder[a.priority] - prioOrder[b.priority]);
    return {
      total: missions.length,
      summary: { CRITICAL: missions.filter((m) => m.priority === 'CRITICAL').length, HIGH: missions.filter((m) => m.priority === 'HIGH').length, MEDIUM: missions.filter((m) => m.priority === 'MEDIUM').length, LOW: missions.filter((m) => m.priority === 'LOW').length },
      missions,
    };
  }

  async getMissionsSummary(user: JwtPayload, params: { unitId?: string }) {
    const r = await this.getMissions(user, { ...params, periodDays: 14 });
    return { total: r.total, summary: r.summary, topMissions: r.missions.slice(0, 5) };
  }

}
