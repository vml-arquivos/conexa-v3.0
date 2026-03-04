import { ForbiddenException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RoleLevel } from '@prisma/client';
import type { JwtPayload } from '../auth/interfaces/jwt-payload.interface';

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
}
