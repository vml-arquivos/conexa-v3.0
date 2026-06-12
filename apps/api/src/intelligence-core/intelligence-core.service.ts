import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { RoleLevel, RoleType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import type { JwtPayload } from '../auth/interfaces/jwt-payload.interface';

type PeriodParams = { startDate?: string; endDate?: string };
type Severity = 'BAIXA' | 'MEDIA' | 'ALTA' | 'CRITICA';
type AttentionPoint = {
  code: string;
  title: string;
  severity: Severity;
  description: string;
  evidence: Array<{ source: string; date?: Date | string | null; summary: string }>;
  recommendation: string;
  requiresHumanReview: boolean;
  allowedForFamilyReport: boolean;
};

const CENTRAL_LEVELS = [RoleLevel.DEVELOPER, RoleLevel.MANTENEDORA, RoleLevel.STAFF_CENTRAL];
const CARE_RESTRICTED_ROLES = [
  RoleType.UNIDADE_DIRETOR,
  RoleType.UNIDADE_COORDENADOR_PEDAGOGICO,
  RoleType.UNIDADE_NUTRICIONISTA,
  RoleType.STAFF_CENTRAL_PSICOLOGIA,
  RoleType.STAFF_CENTRAL_PEDAGOGICO,
  RoleType.MANTENEDORA_ADMIN,
  RoleType.DEVELOPER,
];

function hasCentralAccess(user: JwtPayload): boolean {
  return user.roles?.some((role) => CENTRAL_LEVELS.includes(role.level)) ?? false;
}

function hasRoleLevel(user: JwtPayload, level: RoleLevel): boolean {
  return user.roles?.some((role) => role.level === level) ?? false;
}

function hasCareRestrictedAccess(user: JwtPayload): boolean {
  return user.roles?.some((role) => CARE_RESTRICTED_ROLES.includes(role.type)) ?? false;
}

function parsePeriod(params: PeriodParams, fallbackDays = 180) {
  const end = params.endDate ? new Date(`${params.endDate}T23:59:59-03:00`) : new Date();
  const start = params.startDate ? new Date(`${params.startDate}T00:00:00-03:00`) : new Date(end);
  if (!params.startDate) start.setDate(start.getDate() - fallbackDays);
  return { start, end };
}

function safeText(value?: string | null, max = 260): string {
  if (!value) return '';
  return value.replace(/\s+/g, ' ').trim().slice(0, max);
}

function percent(part: number, total: number): number | null {
  if (!total) return null;
  return Math.round((part / total) * 100);
}

function addAttention(points: AttentionPoint[], point: AttentionPoint) {
  points.push(point);
}

@Injectable()
export class IntelligenceCoreService {
  constructor(private readonly prisma: PrismaService) {}

  private async assertChildAccess(childId: string, user: JwtPayload) {
    if (!childId) throw new ForbiddenException('Criança inválida');
    if (!user?.mantenedoraId) throw new ForbiddenException('Escopo inválido');

    const child = await this.prisma.child.findFirst({
      where: { id: childId, mantenedoraId: user.mantenedoraId, isActive: true },
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
        laudado: true,
        tipoLaudo: true,
        descricaoLaudo: true,
        cid: true,
        medicamentos: true,
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

    if (!child) throw new NotFoundException('Criança não encontrada no escopo permitido');

    const activeEnrollment = child.enrollments?.[0] ?? null;
    const classroomId = activeEnrollment?.classroomId ?? null;
    const roleUnitScopes = user.roles?.flatMap((role) => role.unitScopes ?? []) ?? [];

    if (hasCentralAccess(user)) {
      if (roleUnitScopes.length > 0 && !roleUnitScopes.includes(child.unitId)) {
        throw new ForbiddenException('Usuário sem acesso à unidade da criança');
      }
      return { child, classroomId, classroomName: activeEnrollment?.classroom?.name ?? null };
    }

    if (hasRoleLevel(user, RoleLevel.UNIDADE)) {
      if (!user.unitId || user.unitId !== child.unitId) {
        throw new ForbiddenException('Usuário sem acesso à unidade da criança');
      }
      return { child, classroomId, classroomName: activeEnrollment?.classroom?.name ?? null };
    }

    if (hasRoleLevel(user, RoleLevel.PROFESSOR)) {
      if (!classroomId) throw new ForbiddenException('Criança sem turma ativa para validação do professor');
      const link = await this.prisma.classroomTeacher.findFirst({
        where: { classroomId, teacherId: user.sub, isActive: true },
        select: { id: true },
      });
      if (!link) throw new ForbiddenException('Professor sem vínculo com a turma da criança');
      return { child, classroomId, classroomName: activeEnrollment?.classroom?.name ?? null };
    }

    throw new ForbiddenException('Perfil sem acesso ao núcleo de inteligência');
  }

  private async assertClassroomAccess(classroomId: string, user: JwtPayload) {
    if (!classroomId) throw new ForbiddenException('Turma inválida');
    if (!user?.mantenedoraId) throw new ForbiddenException('Escopo inválido');

    const classroom = await this.prisma.classroom.findFirst({
      where: { id: classroomId, mantenedoraId: user.mantenedoraId },
      select: { id: true, name: true, unitId: true, mantenedoraId: true },
    });
    if (!classroom) throw new NotFoundException('Turma não encontrada');

    const roleUnitScopes = user.roles?.flatMap((role) => role.unitScopes ?? []) ?? [];
    if (hasCentralAccess(user)) {
      if (roleUnitScopes.length > 0 && !roleUnitScopes.includes(classroom.unitId)) {
        throw new ForbiddenException('Usuário sem acesso à unidade da turma');
      }
      return classroom;
    }
    if (hasRoleLevel(user, RoleLevel.UNIDADE)) {
      if (!user.unitId || user.unitId !== classroom.unitId) {
        throw new ForbiddenException('Usuário sem acesso à unidade da turma');
      }
      return classroom;
    }
    if (hasRoleLevel(user, RoleLevel.PROFESSOR)) {
      const link = await this.prisma.classroomTeacher.findFirst({
        where: { classroomId, teacherId: user.sub, isActive: true },
        select: { id: true },
      });
      if (!link) throw new ForbiddenException('Professor sem vínculo com a turma');
      return classroom;
    }
    throw new ForbiddenException('Perfil sem acesso ao núcleo de inteligência');
  }

  async getIntegralChildProfile(childId: string, user: JwtPayload, params: PeriodParams) {
    const { child, classroomId, classroomName } = await this.assertChildAccess(childId, user);
    const { start, end } = parsePeriod(params, 180);
    const canSeeRestrictedCare = hasCareRestrictedAccess(user) || hasCentralAccess(user);

    const [attendance, diaryEvents, observations, rdics, dietaryRestrictions, familyMeetings, nutritionalFollowUp, openAlerts, plannings] = await Promise.all([
      this.prisma.attendance.findMany({
        where: { childId, mantenedoraId: child.mantenedoraId, unitId: child.unitId, date: { gte: start, lte: end } },
        orderBy: { date: 'desc' },
        select: { id: true, date: true, status: true, justification: true },
      }),
      this.prisma.diaryEvent.findMany({
        where: { childId, mantenedoraId: child.mantenedoraId, unitId: child.unitId, eventDate: { gte: start, lte: end } },
        orderBy: { eventDate: 'desc' },
        take: 200,
        select: {
          id: true,
          eventDate: true,
          type: true,
          title: true,
          description: true,
          observations: true,
          developmentNotes: true,
          behaviorNotes: true,
          medicaoAlimentar: true,
          sonoMinutos: true,
          trocaFraldaStatus: true,
          status: true,
          planningId: true,
          curriculumEntryId: true,
        },
      }),
      this.prisma.developmentObservation.findMany({
        where: { childId, date: { gte: start, lte: end } },
        orderBy: { date: 'desc' },
        take: 200,
        select: {
          id: true,
          date: true,
          category: true,
          behaviorDescription: true,
          socialInteraction: true,
          emotionalState: true,
          motorSkills: true,
          cognitiveSkills: true,
          languageSkills: true,
          healthNotes: true,
          dietaryNotes: true,
          sleepPattern: true,
          learningProgress: true,
          planningParticipation: true,
          interests: true,
          challenges: true,
          psychologicalNotes: true,
          developmentAlerts: true,
          recommendations: true,
          nextSteps: true,
          tags: true,
          indicadores: true,
        },
      }),
      this.prisma.rDIXInstancia.findMany({
        where: { childId, mantenedoraId: child.mantenedoraId, unitId: child.unitId },
        orderBy: { criadoEm: 'desc' },
        take: 50,
        select: { id: true, periodo: true, periodoEnum: true, anoLetivo: true, status: true, criadoEm: true, atualizadoEm: true, submittedAt: true, reviewedAt: true, finalizadoEm: true, publicadoEm: true },
      }),
      this.prisma.dietaryRestriction.findMany({
        where: { childId, isActive: true },
        orderBy: { createdAt: 'desc' },
        select: { id: true, type: true, name: true, description: true, severity: true, allowedFoods: true, forbiddenFoods: true, createdAt: true },
      }),
      this.prisma.atendimentoPais.findMany({
        where: { childId, mantenedoraId: child.mantenedoraId, unitId: child.unitId, dataAtendimento: { gte: start, lte: end } },
        orderBy: { dataAtendimento: 'desc' },
        take: 50,
        select: { id: true, tipo: true, status: true, dataAtendimento: true, assunto: true, descricao: true, encaminhamento: true, retornoNecessario: true, dataRetorno: true },
      }),
      this.prisma.acompanhamentoNutricional.findUnique({
        where: { childId },
        select: { id: true, statusCaso: true, ativo: true, motivoAcompanhamento: true, objetivos: true, condutaAtual: true, restricoesOperacionais: true, substituicoesSeguras: true, orientacoesProfCozinha: true, frequenciaRevisao: true, proximaReavaliacao: true, atualizadoEm: true },
      }),
      this.prisma.alertaOperacional.findMany({
        where: { childId, mantenedoraId: child.mantenedoraId, resolvido: false },
        orderBy: { criadoEm: 'desc' },
        take: 30,
        select: { id: true, tipo: true, severidade: true, titulo: true, descricao: true, criadoEm: true },
      }),
      classroomId ? this.prisma.planning.findMany({
        where: { classroomId, mantenedoraId: child.mantenedoraId, unitId: child.unitId, OR: [{ startDate: { gte: start, lte: end } }, { endDate: { gte: start, lte: end } }] },
        orderBy: { startDate: 'desc' },
        take: 80,
        select: { id: true, title: true, status: true, startDate: true, endDate: true },
      }) : Promise.resolve([]),
    ]);

    const attendanceTotal = attendance.length;
    const presentCount = attendance.filter((a) => String(a.status) === 'PRESENTE').length;
    const absentCount = attendance.filter((a) => String(a.status) === 'AUSENTE').length;
    const lateCount = attendance.filter((a) => String(a.status) === 'ATRASO').length;
    const justifiedCount = attendance.filter((a) => String(a.status) === 'JUSTIFICADO').length;
    const presenceRate = percent(presentCount, attendanceTotal);

    const observationsWithAnySensitiveCare = observations.filter((o) => o.healthNotes || o.dietaryNotes || o.psychologicalNotes || o.developmentAlerts);
    const recentDiaryWithBehavior = diaryEvents.filter((d) => d.behaviorNotes || d.developmentNotes || d.observations).slice(0, 12);
    const rdicPending = rdics.filter((r) => ['RASCUNHO', 'DEVOLVIDO'].includes(String(r.status))).length;
    const rdicInReview = rdics.filter((r) => ['EM_REVISAO', 'APROVADO', 'FINALIZADO'].includes(String(r.status))).length;
    const rdicPublished = rdics.filter((r) => String(r.status) === 'PUBLICADO').length;

    const attentionPoints: AttentionPoint[] = [];

    if (presenceRate !== null && presenceRate < 80) {
      addAttention(attentionPoints, {
        code: 'ATTENDANCE_BELOW_EXPECTED',
        title: `Frequência abaixo do esperado (${presenceRate}%)`,
        severity: presenceRate < 60 ? 'ALTA' : 'MEDIA',
        description: 'A frequência recente está abaixo do patamar de acompanhamento recomendado para análise pedagógica e administrativa.',
        evidence: attendance.slice(0, 8).map((a) => ({ source: 'Attendance', date: a.date, summary: `${a.status}${a.justification ? ` — ${safeText(a.justification, 120)}` : ''}` })),
        recommendation: 'Conferir justificativas, comunicar coordenação/secretaria e alinhar com a família quando necessário.',
        requiresHumanReview: true,
        allowedForFamilyReport: false,
      });
    }

    if (observations.length < 2 && diaryEvents.length < 3) {
      addAttention(attentionPoints, {
        code: 'LOW_RECORD_VOLUME',
        title: 'Poucos registros no período',
        severity: 'MEDIA',
        description: 'Há poucos registros pedagógicos/observacionais para sustentar um relatório individual robusto.',
        evidence: [{ source: 'Sistema', summary: `${observations.length} observação(ões) e ${diaryEvents.length} diário(s) encontrados no período.` }],
        recommendation: 'Solicitar novas observações direcionadas antes de finalizar RDIC ou relatório sensível.',
        requiresHumanReview: true,
        allowedForFamilyReport: true,
      });
    }

    if (observations.some((o) => o.developmentAlerts)) {
      const flagged = observations.filter((o) => o.developmentAlerts).slice(0, 6);
      addAttention(attentionPoints, {
        code: 'DEVELOPMENT_ATTENTION_RECORDS',
        title: `${flagged.length} registro(s) com ponto de atenção de desenvolvimento`,
        severity: flagged.length >= 3 ? 'ALTA' : 'MEDIA',
        description: 'Foram encontrados registros que pedem revisão da coordenação antes de qualquer encaminhamento ou devolutiva externa.',
        evidence: flagged.map((o) => ({ source: 'DevelopmentObservation', date: o.date, summary: safeText(o.developmentAlerts, 180) })),
        recommendation: 'Revisar as evidências com coordenação/psicologia e registrar nova observação direcionada se necessário.',
        requiresHumanReview: true,
        allowedForFamilyReport: false,
      });
    }

    if (dietaryRestrictions.length > 0 || child.allergies || nutritionalFollowUp) {
      const severe = dietaryRestrictions.some((r) => String(r.severity || '').toLowerCase().includes('sever'));
      addAttention(attentionPoints, {
        code: 'NUTRITION_HEALTH_ATTENTION',
        title: 'Atenção de saúde/nutrição ativa',
        severity: severe ? 'CRITICA' : 'MEDIA',
        description: 'Há restrição alimentar, alergia, condição de saúde ou acompanhamento nutricional que precisa ser observado na rotina.',
        evidence: [
          ...dietaryRestrictions.slice(0, 5).map((r) => ({ source: 'DietaryRestriction', date: r.createdAt, summary: `${r.name}${r.severity ? ` — ${r.severity}` : ''}` })),
          ...(child.allergies ? [{ source: 'Child.health', summary: 'Alergias cadastradas na ficha da criança.' }] : []),
          ...(nutritionalFollowUp ? [{ source: 'AcompanhamentoNutricional', date: nutritionalFollowUp.atualizadoEm, summary: `Status: ${nutritionalFollowUp.statusCaso}` }] : []),
        ],
        recommendation: 'Conferir orientações da nutricionista/cozinha antes de refeições e atividades com alimentos.',
        requiresHumanReview: true,
        allowedForFamilyReport: false,
      });
    }

    if (familyMeetings.some((m) => m.retornoNecessario)) {
      const pending = familyMeetings.filter((m) => m.retornoNecessario).slice(0, 5);
      addAttention(attentionPoints, {
        code: 'FAMILY_FOLLOW_UP_PENDING',
        title: 'Atendimento familiar com retorno necessário',
        severity: 'MEDIA',
        description: 'Existem atendimentos com necessidade de retorno ou continuidade de acompanhamento.',
        evidence: pending.map((m) => ({ source: 'AtendimentoPais', date: m.dataAtendimento, summary: safeText(m.assunto, 160) })),
        recommendation: 'Acompanhar retorno com a família e atualizar o registro antes de gerar relatório final.',
        requiresHumanReview: true,
        allowedForFamilyReport: false,
      });
    }

    for (const alerta of openAlerts.slice(0, 8)) {
      addAttention(attentionPoints, {
        code: `OPERATIONAL_${alerta.tipo}`,
        title: alerta.titulo,
        severity: String(alerta.severidade) as Severity,
        description: alerta.descricao,
        evidence: [{ source: 'AlertaOperacional', date: alerta.criadoEm, summary: alerta.descricao }],
        recommendation: 'Revisar alerta operacional e registrar providência pela equipe responsável.',
        requiresHumanReview: true,
        allowedForFamilyReport: false,
      });
    }

    const safeNutritionalFollowUp = nutritionalFollowUp
      ? (canSeeRestrictedCare ? nutritionalFollowUp : {
          id: nutritionalFollowUp.id,
          statusCaso: nutritionalFollowUp.statusCaso,
          ativo: nutritionalFollowUp.ativo,
          restricoesOperacionais: nutritionalFollowUp.restricoesOperacionais,
          substituicoesSeguras: nutritionalFollowUp.substituicoesSeguras,
          orientacoesProfCozinha: nutritionalFollowUp.orientacoesProfCozinha,
          proximaReavaliacao: nutritionalFollowUp.proximaReavaliacao,
        })
      : null;

    return {
      module: 'Zelare Intelligence Core',
      readonly: true,
      period: { startDate: start.toISOString().slice(0, 10), endDate: end.toISOString().slice(0, 10) },
      child: {
        id: child.id,
        name: `${child.firstName} ${child.lastName}`.trim(),
        dateOfBirth: child.dateOfBirth,
        unitId: child.unitId,
        classroomId,
        classroomName,
      },
      metrics: {
        attendance: { total: attendanceTotal, present: presentCount, absent: absentCount, late: lateCount, justified: justifiedCount, presenceRate },
        records: { diaryEvents: diaryEvents.length, observations: observations.length, observationsWithCareSignals: observationsWithAnySensitiveCare.length, familyMeetings: familyMeetings.length },
        rdic: { total: rdics.length, pending: rdicPending, inReview: rdicInReview, published: rdicPublished },
        nutrition: { dietaryRestrictions: dietaryRestrictions.length, hasNutritionalFollowUp: Boolean(nutritionalFollowUp) },
        planning: { totalPlansInPeriod: plannings.length, linkedDiaryEvents: diaryEvents.filter((d) => d.planningId).length },
        alerts: { open: openAlerts.length },
      },
      attentionPoints: attentionPoints.sort((a, b) => ['BAIXA', 'MEDIA', 'ALTA', 'CRITICA'].indexOf(b.severity) - ['BAIXA', 'MEDIA', 'ALTA', 'CRITICA'].indexOf(a.severity)),
      recommendations: this.buildRecommendations(attentionPoints),
      sources: {
        attendance: attendance.slice(0, 20),
        diaryEvents: recentDiaryWithBehavior.map((d) => ({
          id: d.id,
          date: d.eventDate,
          type: d.type,
          title: d.title,
          status: d.status,
          evidence: safeText(d.developmentNotes || d.behaviorNotes || d.observations || d.description, 240),
        })),
        observations: observations.slice(0, 20).map((o) => this.normalizeObservation(o, canSeeRestrictedCare)),
        rdic: rdics.slice(0, 10),
        dietaryRestrictions: canSeeRestrictedCare ? dietaryRestrictions : dietaryRestrictions.map((r) => ({ id: r.id, type: r.type, name: r.name, severity: r.severity, forbiddenFoods: r.forbiddenFoods })),
        nutritionalFollowUp: safeNutritionalFollowUp,
        familyMeetings: canSeeRestrictedCare ? familyMeetings.slice(0, 10) : familyMeetings.slice(0, 10).map((m) => ({ id: m.id, tipo: m.tipo, status: m.status, dataAtendimento: m.dataAtendimento, assunto: m.assunto, retornoNecessario: m.retornoNecessario })),
      },
      safety: {
        clinicalDiagnosis: false,
        humanReviewRequired: true,
        externalAiAllowedOnlyAfterAnonymization: true,
        automaticFamilyCommunicationAllowed: false,
        notes: 'Este endpoint apenas organiza evidências e pontos de atenção. Não diagnostica, não decide e não altera dados.',
      },
    };
  }

  async getRdicDraftContext(childId: string, user: JwtPayload, params: PeriodParams) {
    const profile = await this.getIntegralChildProfile(childId, user, params);
    const evidence = profile.sources;

    const sections = [
      {
        key: 'sintese_geral',
        title: 'Síntese geral do período',
        evidence: [
          `${profile.metrics.records.diaryEvents} diário(s), ${profile.metrics.records.observations} observação(ões), ${profile.metrics.attendance.total} chamada(s) e ${profile.metrics.rdic.total} RDIC(s) consultados.`,
        ],
        draftGuidance: 'Descrever a evolução geral com base apenas nas evidências disponíveis, sem julgamento clínico.',
      },
      {
        key: 'frequencia_rotina',
        title: 'Frequência e rotina',
        evidence: [`Presença: ${profile.metrics.attendance.presenceRate ?? 'sem dados'}% no período analisado.`],
        draftGuidance: 'Mencionar frequência, rotina e necessidade de alinhamento com a família quando houver recorrência de ausências.',
      },
      {
        key: 'interacao_social',
        title: 'Interação e socialização',
        evidence: evidence.observations.map((o: any) => o.socialInteraction).filter(Boolean).slice(0, 6),
        draftGuidance: 'Usar registros de socialização e participação coletiva, sem rótulos ou diagnósticos.',
      },
      {
        key: 'comunicacao_linguagem',
        title: 'Comunicação e linguagem',
        evidence: evidence.observations.map((o: any) => o.languageSkills).filter(Boolean).slice(0, 6),
        draftGuidance: 'Descrever avanços e pontos de atenção em fala, escuta, expressão e compreensão.',
      },
      {
        key: 'autonomia_rotina',
        title: 'Autonomia e rotina',
        evidence: evidence.observations.map((o: any) => o.behaviorDescription || o.learningProgress).filter(Boolean).slice(0, 6),
        draftGuidance: 'Citar autonomia, adaptação, organização, alimentação/higiene quando houver evidências.',
      },
      {
        key: 'saude_nutricao',
        title: 'Saúde, nutrição e cuidados',
        evidence: [
          ...profile.sources.dietaryRestrictions.map((r: any) => `${r.name}${r.severity ? ` — ${r.severity}` : ''}`),
          ...(profile.sources.nutritionalFollowUp ? ['Acompanhamento nutricional ativo.'] : []),
        ],
        draftGuidance: 'Registrar apenas cuidados operacionais e orientações revisadas por nutrição/coordenação.',
      },
      {
        key: 'pontos_atencao',
        title: 'Pontos que merecem acompanhamento',
        evidence: profile.attentionPoints.map((p: any) => `${p.title}: ${p.description}`).slice(0, 10),
        draftGuidance: 'Usar linguagem de cuidado e acompanhamento. Não citar transtornos, doenças ou diagnósticos.',
      },
      {
        key: 'recomendacoes',
        title: 'Recomendações pedagógicas e de cuidado',
        evidence: profile.recommendations.map((r: any) => r.text),
        draftGuidance: 'Converter recomendações em próximos passos revisáveis por professor/coordenação/área técnica.',
      },
    ];

    return {
      module: 'Zelare Intelligence Core',
      readonly: true,
      child: profile.child,
      period: profile.period,
      rdicDraftContext: {
        generatedFromSources: profile.metrics,
        sections,
        attentionPoints: profile.attentionPoints,
        promptSafetyRules: [
          'Usar exclusivamente as evidências fornecidas.',
          'Não inventar fatos.',
          'Não diagnosticar clinicamente.',
          'Não citar nomes de transtornos ou doenças como conclusão.',
          'Não recomendar medicamentos ou tratamentos.',
          'Diferenciar observação, interpretação pedagógica e recomendação.',
          'Manter revisão humana obrigatória antes de publicar ou enviar à família.',
        ],
      },
      safety: profile.safety,
    };
  }

  async getClassroomOverview(classroomId: string, user: JwtPayload, params: PeriodParams) {
    const classroom = await this.assertClassroomAccess(classroomId, user);
    const { start, end } = parsePeriod(params, 30);

    const enrollments = await this.prisma.enrollment.findMany({
      where: { classroomId, status: 'ATIVA' },
      select: { childId: true, child: { select: { id: true, firstName: true, lastName: true } } },
    });
    const activeChildIds = enrollments.map((e) => e.childId);

    const [attendance, diaryEvents, observations, rdics, restrictions, alerts] = await Promise.all([
      this.prisma.attendance.findMany({
        where: { classroomId, mantenedoraId: classroom.mantenedoraId, unitId: classroom.unitId, date: { gte: start, lte: end } },
        select: { childId: true, status: true, date: true },
      }),
      this.prisma.diaryEvent.findMany({
        where: { classroomId, mantenedoraId: classroom.mantenedoraId, unitId: classroom.unitId, eventDate: { gte: start, lte: end } },
        select: { childId: true, status: true, eventDate: true, planningId: true },
      }),
      this.prisma.developmentObservation.findMany({
        where: { classroomId, date: { gte: start, lte: end } },
        select: { childId: true, date: true, developmentAlerts: true, healthNotes: true, dietaryNotes: true, psychologicalNotes: true },
      }),
      this.prisma.rDIXInstancia.findMany({
        where: { classroomId, mantenedoraId: classroom.mantenedoraId, unitId: classroom.unitId },
        select: { childId: true, status: true, periodo: true, anoLetivo: true },
      }),
      this.prisma.dietaryRestriction.findMany({
        where: { childId: { in: activeChildIds }, isActive: true },
        select: { childId: true, severity: true },
      }),
      this.prisma.alertaOperacional.findMany({
        where: { classroomId, mantenedoraId: classroom.mantenedoraId, resolvido: false },
        take: 50,
        orderBy: { criadoEm: 'desc' },
        select: { id: true, childId: true, tipo: true, severidade: true, titulo: true, criadoEm: true },
      }),
    ]);

    const childIds = enrollments.map((e) => e.childId);
    const children = enrollments.map((e) => {
      const childAttendance = attendance.filter((a) => a.childId === e.childId);
      const childDiary = diaryEvents.filter((d) => d.childId === e.childId);
      const childObservations = observations.filter((o) => o.childId === e.childId);
      const childRdic = rdics.filter((r) => r.childId === e.childId);
      const childRestrictions = restrictions.filter((r) => r.childId === e.childId);
      const present = childAttendance.filter((a) => String(a.status) === 'PRESENTE').length;
      const rate = percent(present, childAttendance.length);
      const flags: string[] = [];
      if (rate !== null && rate < 80) flags.push('frequencia_baixa');
      if (childDiary.length === 0 && childObservations.length === 0) flags.push('sem_registros_recentes');
      if (childObservations.some((o) => o.developmentAlerts || o.healthNotes || o.dietaryNotes || o.psychologicalNotes)) flags.push('pontos_de_atencao');
      if (childRestrictions.length > 0) flags.push('restricao_alimentar');
      if (childRdic.filter((r) => ['RASCUNHO', 'DEVOLVIDO'].includes(String(r.status))).length > 0) flags.push('rdic_pendente');
      return {
        childId: e.childId,
        name: `${e.child.firstName} ${e.child.lastName}`.trim(),
        metrics: {
          attendanceRecords: childAttendance.length,
          presenceRate: rate,
          diaryRecords: childDiary.length,
          observations: childObservations.length,
          rdicTotal: childRdic.length,
          dietaryRestrictions: childRestrictions.length,
        },
        flags,
      };
    });

    const totalAttendance = attendance.length;
    const totalPresent = attendance.filter((a) => String(a.status) === 'PRESENTE').length;

    return {
      module: 'Zelare Intelligence Core',
      readonly: true,
      classroom: { id: classroom.id, name: classroom.name, unitId: classroom.unitId },
      period: { startDate: start.toISOString().slice(0, 10), endDate: end.toISOString().slice(0, 10) },
      metrics: {
        children: childIds.length,
        attendance: { total: totalAttendance, present: totalPresent, presenceRate: percent(totalPresent, totalAttendance) },
        diaryEvents: diaryEvents.length,
        observations: observations.length,
        rdic: { total: rdics.length, pending: rdics.filter((r) => ['RASCUNHO', 'DEVOLVIDO'].includes(String(r.status))).length, published: rdics.filter((r) => String(r.status) === 'PUBLICADO').length },
        restrictions: restrictions.length,
        openAlerts: alerts.length,
      },
      children,
      attentionSummary: {
        lowAttendance: children.filter((c) => c.flags.includes('frequencia_baixa')).length,
        noRecentRecords: children.filter((c) => c.flags.includes('sem_registros_recentes')).length,
        careSignals: children.filter((c) => c.flags.includes('pontos_de_atencao')).length,
        dietaryRestrictions: children.filter((c) => c.flags.includes('restricao_alimentar')).length,
        rdicPending: children.filter((c) => c.flags.includes('rdic_pendente')).length,
      },
      alerts: alerts.slice(0, 20),
      safety: {
        clinicalDiagnosis: false,
        humanReviewRequired: true,
        automaticFamilyCommunicationAllowed: false,
        notes: 'Visão agregada para priorização pedagógica/operacional. Não altera dados.',
      },
    };
  }

  private normalizeObservation(o: any, canSeeRestrictedCare: boolean) {
    const base: any = {
      id: o.id,
      date: o.date,
      category: o.category,
      behaviorDescription: safeText(o.behaviorDescription),
      socialInteraction: safeText(o.socialInteraction),
      emotionalState: safeText(o.emotionalState),
      motorSkills: safeText(o.motorSkills),
      cognitiveSkills: safeText(o.cognitiveSkills),
      languageSkills: safeText(o.languageSkills),
      learningProgress: safeText(o.learningProgress),
      planningParticipation: safeText(o.planningParticipation),
      interests: safeText(o.interests),
      challenges: safeText(o.challenges),
      developmentAlerts: safeText(o.developmentAlerts),
      recommendations: safeText(o.recommendations),
      nextSteps: safeText(o.nextSteps),
      tags: o.tags,
      indicadores: o.indicadores,
    };
    if (canSeeRestrictedCare) {
      base.healthNotes = safeText(o.healthNotes);
      base.dietaryNotes = safeText(o.dietaryNotes);
      base.sleepPattern = safeText(o.sleepPattern);
      base.psychologicalNotes = safeText(o.psychologicalNotes);
    }
    return base;
  }

  private buildRecommendations(points: AttentionPoint[]) {
    const recommendations = points.map((point) => ({
      sourceCode: point.code,
      severity: point.severity,
      text: point.recommendation,
      requiresHumanReview: point.requiresHumanReview,
    }));

    if (!recommendations.length) {
      recommendations.push({
        sourceCode: 'KEEP_MONITORING',
        severity: 'BAIXA' as Severity,
        text: 'Manter acompanhamento regular e registrar evidências pedagógicas, de rotina e cuidado conforme o período.',
        requiresHumanReview: false,
      });
    }

    return recommendations;
  }
}
