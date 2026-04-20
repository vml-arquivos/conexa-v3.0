import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../common/services/audit.service';
import { CreateDiaryEventDto } from './dto/create-diary-event.dto';
import { UpdateDiaryEventDto } from './dto/update-diary-event.dto';
import { QueryDiaryEventDto } from './dto/query-diary-event.dto';
import type { JwtPayload } from '../auth/interfaces/jwt-payload.interface';
import { RoleLevel, PlanningStatus, AuditLogEntity } from '@prisma/client';
import {
  getPedagogicalDay,
  formatPedagogicalDate,
  assertSchoolDay,
  isSchoolDay,
} from '../common/utils/date.utils';
import { getScopedWhereForDiaryEvent } from './diary-event-scope.helper';

@Injectable()
export class DiaryEventService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  /**
   * Cria um novo evento no diário de bordo.
   * planningId e curriculumEntryId são opcionais para permitir registros
   * de microgestos e diário sem vínculo obrigatório a um planejamento.
   */
  async create(createDto: CreateDiaryEventDto, user: JwtPayload) {
    const eventDate = new Date(createDto.eventDate);
    const todayPed = getPedagogicalDay(new Date());
    const eventPed = getPedagogicalDay(eventDate);

    // TRAVA: Bloquear datas futuras
    if (eventPed > todayPed) {
      throw new BadRequestException(
        `Não é permitido registrar eventos em datas futuras (${formatPedagogicalDate(eventDate)}).`,
      );
    }

    // TRAVA: Bloquear dias não letivos (fins de semana e feriados configurados)
    // Buscar datas não letivas da unidade para validar
    if (user.unitId) {
      const unit = await this.prisma.unit.findUnique({
        where: { id: user.unitId },
        select: { nonSchoolDays: true },
      });
      assertSchoolDay(eventDate, unit?.nonSchoolDays ?? [], BadRequestException);
    }

    // Resolver classroomId: usar o fornecido (se válido) ou buscar via matrícula ativa da criança.
    // Ignorar valores inválidos como 'undefined', '' ou strings que não são CUID.
    const CUID_RE = /^c[a-z0-9]{24,}$/i;
    const rawClassroomId = createDto.classroomId;
    let resolvedClassroomId: string | undefined =
      rawClassroomId && CUID_RE.test(rawClassroomId) ? rawClassroomId : undefined;
    if (!resolvedClassroomId) {
      const activeEnrollment = await this.prisma.enrollment.findFirst({
        where: { childId: createDto.childId, status: 'ATIVA' },
        select: { classroomId: true },
        orderBy: { createdAt: 'desc' },
      });
      if (!activeEnrollment) {
        throw new BadRequestException('Criança não possui matrícula ativa em nenhuma turma');
      }
      resolvedClassroomId = activeEnrollment.classroomId;
    }

    // Validar se a criança existe e pertence à turma
    const child = await this.prisma.child.findUnique({
      where: { id: createDto.childId },
      include: {
        enrollments: {
          where: {
            classroomId: resolvedClassroomId,
            status: 'ATIVA',
          },
        },
      },
    });

    if (!child) {
      throw new NotFoundException('Criança não encontrada');
    }

    if (child.enrollments.length === 0) {
      throw new BadRequestException('Criança não está matriculada nesta turma');
    }

    // Validar se a turma existe
    const classroom = await this.prisma.classroom.findUnique({
      where: { id: resolvedClassroomId },
      include: {
        unit: {
          select: {
            id: true,
            mantenedoraId: true,
          },
        },
      },
    });

    if (!classroom) {
      throw new NotFoundException('Turma não encontrada');
    }

    // Validação de acesso por nível hierárquico
    await this.validateUserAccess(user, classroom);

    // Ocorrências: planningId e curriculumEntryId são opcionais.
    // O professor pode registrar uma ocorrência mesmo sem planejamento ativo.
    const isOcorrencia = createDto.tags?.includes('ocorrencia') ||
      ['COMPORTAMENTO', 'SAUDE', 'FAMILIA'].includes(createDto.type);

    // Sanitizar planningId e curriculumEntryId — ignorar valores não-CUID
    const resolvedPlanningId = createDto.planningId && CUID_RE.test(createDto.planningId)
      ? createDto.planningId : undefined;
    const resolvedCurriculumEntryId = createDto.curriculumEntryId && CUID_RE.test(createDto.curriculumEntryId)
      ? createDto.curriculumEntryId : undefined;

    // REGRA DE OURO (segurança produção): Diário publicado exige planejamento APROVADO ou EM_EXECUCAO ativo.
    // Cobre o tipo atual ATIVIDADE_PEDAGOGICA (frontend) e o legado DIARIO_BORDO.
    // Ocorrências são isentas — podem ocorrer fora do planejamento pedagógico.
    const isPublicacao =
      createDto.status === 'PUBLICADO' || createDto.status == null;
    const isDiarioBordo =
      !isOcorrencia &&
      isPublicacao &&
      ((createDto.type as string) === 'DIARIO_BORDO' ||
        (createDto.type as string) === 'ATIVIDADE_PEDAGOGICA');
    if (isDiarioBordo && !resolvedPlanningId) {
      // Buscar planejamento ativo da turma para a data do evento
      const activePlanning = await this.prisma.planning.findFirst({
        where: {
          classroomId: resolvedClassroomId,
          mantenedoraId: classroom.unit.mantenedoraId,
          unitId: classroom.unitId,
          status: { in: [PlanningStatus.APROVADO, PlanningStatus.EM_EXECUCAO] },
          startDate: { lte: eventDate },
          endDate: { gte: eventDate },
        },
        orderBy: { startDate: 'desc' },
        select: { id: true },
      });
      if (!activePlanning) {
        throw new BadRequestException(
          `Não há planejamento aprovado ou em execução para esta turma na data ${formatPedagogicalDate(eventDate)}. ` +
          `O Diário de Bordo exige um planejamento ativo. Verifique com a coordenação.`,
        );
      }
      // Vincular automaticamente ao planejamento ativo encontrado
      (createDto as any).planningId = activePlanning.id;
    }

    // GATE AVALIAÇÃO (segurança produção): ATIVIDADE_PEDAGOGICA publicada exige avaliação da execução.
    // Verifica aiContext.avaliacaoPlanoAula (campo principal) ou aiContext.statusExecucaoPlano (fallback).
    if (
      !isOcorrencia &&
      isPublicacao &&
      (createDto.type as string) === 'ATIVIDADE_PEDAGOGICA'
    ) {
      const avaliacaoPreenchida =
        (createDto.aiContext as any)?.avaliacaoPlanoAula?.toString().trim() ||
        (createDto.aiContext as any)?.statusExecucaoPlano?.toString().trim();
      if (!avaliacaoPreenchida) {
        throw new BadRequestException(
          'A publicação do Diário do Dia exige a Avaliação do Plano de Aula preenchida. ' +
          'Preencha o campo "Avaliação do Plano de Aula" antes de publicar.',
        );
      }
    }

    // VALIDAÇÃO OPCIONAL: Planning (somente se planningId fornecido e válido)
    if (resolvedPlanningId) {
      const planning = await this.prisma.planning.findUnique({
        where: { id: resolvedPlanningId },
        include: { classroom: true, curriculumMatrix: true },
      });

      if (!planning) {
        throw new NotFoundException('Planejamento não encontrado');
      }

      if (planning.status === PlanningStatus.CANCELADO) {
        throw new BadRequestException('Planejamento cancelado não pode receber eventos');
      }
      
      // Ocorrências aceitam APROVADO ou EM_EXECUCAO
      if (isOcorrencia && !([PlanningStatus.APROVADO, PlanningStatus.EM_EXECUCAO] as string[]).includes(planning.status)) {
        throw new BadRequestException('Ocorrências só podem ser registradas em planejamentos Aprovados ou Em Execução');
      }

      const planningStart = new Date(planning.startDate);
      const planningEnd = new Date(planning.endDate);
      if (eventDate < planningStart || eventDate > planningEnd) {
        throw new BadRequestException(
          `A data do evento (${formatPedagogicalDate(eventDate)}) deve estar dentro do período do planejamento (${formatPedagogicalDate(planningStart)} - ${formatPedagogicalDate(planningEnd)})`,
        );
      }

      if (planning.classroomId !== resolvedClassroomId) {
        throw new BadRequestException('O planejamento não pertence à turma informada');
      }
    }

    // VALIDAÇÃO OPCIONAL: CurriculumEntry (somente se curriculumEntryId fornecido e válido)
    if (resolvedCurriculumEntryId) {
      const entry = await this.prisma.curriculumMatrixEntry.findUnique({
        where: { id: resolvedCurriculumEntryId },
      });
      if (!entry) {
        throw new NotFoundException('Entrada da matriz curricular não encontrada');
      }
    }

    // Validação de segmento etário removida: qualquer criança pode ter ocorrências registradas
    // independente da faixa etária da turma (chegada/saída, saúde, material, comportamento, etc.)

    // GATE RETROATIVO (segurança produção): edição de data anterior exige planning aprovado no alvo
    if (createDto.retroactiveEdit) {
      const activePlanRetro = await this.prisma.planning.findFirst({
        where: {
          classroomId: resolvedClassroomId,
          mantenedoraId: classroom.unit.mantenedoraId,
          unitId: classroom.unitId,
          status: { in: [PlanningStatus.APROVADO, PlanningStatus.EM_EXECUCAO] },
          startDate: { lte: eventDate },
          endDate: { gte: eventDate },
        },
        select: { id: true },
      });
      if (!activePlanRetro) {
        throw new BadRequestException(
          `Edição retroativa bloqueada: não há planejamento aprovado para ${formatPedagogicalDate(eventDate)}. ` +
          `Solicite à coordenação aprovar o planejamento do dia alvo.`,
        );
      }
    }
    // Criar o evento
    const eventData = {
      type: createDto.type,
      title: createDto.title,
      description: createDto.description,
      eventDate,
      childId: createDto.childId,
      classroomId: resolvedClassroomId,
      ...(resolvedPlanningId ? { planningId: resolvedPlanningId } : {}),
      ...(resolvedCurriculumEntryId ? { curriculumEntryId: resolvedCurriculumEntryId } : {}),
      // Micro-gestos estruturados
      medicaoAlimentar: createDto.medicaoAlimentar ?? undefined,
      sonoMinutos: createDto.sonoMinutos ?? undefined,
      trocaFraldaStatus: createDto.trocaFraldaStatus ?? undefined,
      // Observações
      observations: createDto.observations ?? undefined,
      developmentNotes: createDto.developmentNotes ?? undefined,
      behaviorNotes: createDto.behaviorNotes ?? undefined,
      // Microgestos livres e metadados
      tags: createDto.tags || [],
      aiContext: {
        ...(createDto.aiContext || {}),
        microgestos: createDto.microgestos || [],
        presencas: createDto.presencas ?? 0,
        ausencias: createDto.ausencias ?? 0,
      },
      mediaUrls: createDto.mediaUrls || [],
      // PR 2: status explícito — default PUBLICADO (professor salva = publica)
      // Se o cliente enviar RASCUNHO explicitamente, respeita.
      status: createDto.status ?? 'PUBLICADO',
      // GATE RETROATIVO (segurança produção): edição de data anterior exige planning aprovado no alvo
      ...(createDto.retroactiveEdit ? {
        retroactiveEdit: true,
        retroactiveNote: createDto.retroactiveNote ?? null,
      } : {}),
      createdBy: user.sub,
      mantenedoraId: classroom.unit.mantenedoraId,
      unitId: classroom.unitId,
    };
    const diaryEvent = await this.prisma.diaryEvent.create({
      data: eventData,
      include: {
        child: {
          select: { id: true, firstName: true, lastName: true },
        },
        classroom: {
          select: { id: true, name: true },
        },
        createdByUser: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
      },
    });

    // Auditoria automática
    await this.auditService.logCreate(
      AuditLogEntity.DIARY_EVENT,
      diaryEvent.id,
      user.sub,
      classroom.unit.mantenedoraId,
      classroom.unitId,
      diaryEvent,
    );

    return diaryEvent;
  }

  /**
   * Lista eventos com filtros.
   *
   * ESCOPO DE ACESSO:
   * DiaryEvent possui campos raiz mantenedoraId, unitId, classroomId e createdBy.
   * Usamos esses campos diretamente para filtrar por escopo — sem joins desnecessários.
   *
   * Hierarquia:
   *   DEVELOPER      → acesso total (sem filtro)
   *   MANTENEDORA    → filtra por mantenedoraId
   *   STAFF_CENTRAL  → filtra por unitId IN unitScopes (coordenação geral)
   *   UNIDADE        → filtra por unitId (coordenador/diretor da unidade)
   *   PROFESSOR      → filtra por classroomId IN turmas_do_professor OR createdBy
   */
  async findAll(query: QueryDiaryEventDto, user: JwtPayload) {
    const andConditions: any[] = [];
    const pedagogicalOnly = query.pedagogicalOnly === 'true';
    const shouldHideNonSchoolDays =
      pedagogicalOnly && query.type === 'ATIVIDADE_PEDAGOGICA';

    // ── 1. ESCOPO DE ACESSO ──────────────────────────────────────────────────
    if (!user.roles.some((r) => r.level === RoleLevel.DEVELOPER)) {
      if (user.roles.some((r) => r.level === RoleLevel.MANTENEDORA)) {
        // Mantenedora vê tudo da sua rede
        andConditions.push({ mantenedoraId: user.mantenedoraId });

      } else if (user.roles.some((r) => r.level === RoleLevel.STAFF_CENTRAL)) {
        // Coordenação geral: vê todas as unidades em seu escopo
        const staffRole = user.roles.find((r) => r.level === RoleLevel.STAFF_CENTRAL);
        const unitScopes = staffRole?.unitScopes ?? [];
        if (unitScopes.length > 0) {
          andConditions.push({ unitId: { in: unitScopes } });
        } else if (user.unitId) {
          // Fallback: usar unitId do token
          andConditions.push({ unitId: user.unitId });
        } else {
          andConditions.push({ mantenedoraId: user.mantenedoraId });
        }

      } else if (user.roles.some((r) => r.level === RoleLevel.UNIDADE)) {
        // Coordenador/Diretor de unidade: vê todos os eventos da unidade
        andConditions.push({ unitId: user.unitId });

      } else if (user.roles.some((r) => r.level === RoleLevel.PROFESSOR)) {
        // Professor: vê eventos das suas turmas OU que ele criou
        const classrooms = await this.prisma.classroomTeacher.findMany({
          where: { teacherId: user.sub, isActive: true },
          select: { classroomId: true },
        });
        const classroomIds = classrooms.map((ct) => ct.classroomId);
        if (classroomIds.length > 0) {
          andConditions.push({
            OR: [
              { classroomId: { in: classroomIds } },
              { createdBy: user.sub },
            ],
          });
        } else {
          // Professor sem turma formal: ver apenas o que ele criou
          andConditions.push({ createdBy: user.sub });
        }
      }
    }

    // ── 2. FILTROS DA QUERY ──────────────────────────────────────────────────
    if (query.childId)     andConditions.push({ childId: query.childId });
    if (query.classroomId) andConditions.push({ classroomId: query.classroomId });
    if (query.unitId)      andConditions.push({ unitId: query.unitId });
    if (query.type)        andConditions.push({ type: query.type });
    if (query.createdBy)   andConditions.push({ createdBy: query.createdBy });

    // Filtro por tag no array JSON (ex: tag=ocorrencia)
    // IMPORTANTE: Prisma 5 + PostgreSQL — array_contains em campo Json? requer
    // que o valor seja um ARRAY, não uma string simples.
    // Ex correto: { tags: { array_contains: ["ocorrencia"] } }
    // Ex errado:  { tags: { array_contains: "ocorrencia" } }  ← retorna 0 resultados
    if (query.tag) {
      andConditions.push({ tags: { array_contains: [query.tag] } });
    }

    if (query.startDate || query.endDate) {
      const dateFilter: any = {};
      if (query.startDate) dateFilter.gte = new Date(query.startDate);
      if (query.endDate)   dateFilter.lte = new Date(query.endDate);
      andConditions.push({ eventDate: dateFilter });
    }

    // ── 3. QUERY FINAL ───────────────────────────────────────────────
    const where = andConditions.length > 0 ? { AND: andConditions } : {};

    // Respeitar limit/skip enviados pelo cliente (com teto de segurança em 1000)
    const takeVal = query.limit ? Math.min(parseInt(query.limit, 10), 1000) : 500;
    const skipVal = query.skip  ? parseInt(query.skip, 10) : 0;

    const events = await this.prisma.diaryEvent.findMany({
      where,
      include: {
        child:         { select: { id: true, firstName: true, lastName: true, photoUrl: true } },
        classroom:     { select: { id: true, name: true } },
        createdByUser: { select: { id: true, firstName: true, lastName: true, email: true } },
      },
      orderBy: { eventDate: 'desc' },
      take: takeVal,
      skip: skipVal,
    });
    if (!shouldHideNonSchoolDays) return events;

    return events.filter((event) => isSchoolDay(new Date(event.eventDate), []));
  }

  /**
   * Busca um evento por ID
   */
  async findOne(id: string, user: JwtPayload) {
    const scopedWhere = getScopedWhereForDiaryEvent(user);

    const event = await this.prisma.diaryEvent.findFirst({
      where: { id, ...scopedWhere },
      include: {
        child: { select: { id: true, firstName: true, lastName: true } },
        classroom: { select: { id: true, name: true, unitId: true } },
        createdByUser: { select: { id: true, firstName: true, lastName: true, email: true } },
        reviewedByUser: { select: { id: true, firstName: true, lastName: true, email: true } },
      },
    });

    if (!event) {
      throw new NotFoundException('Evento não encontrado');
    }

    if (user.roles.some((role) => role.level === RoleLevel.PROFESSOR)) {
      // Professor pode ver evento se é da sua turma OU se ele próprio criou
      const isTeacher = await this.prisma.classroomTeacher.findFirst({
        where: { classroomId: event.classroomId, teacherId: user.sub, isActive: true },
      });
      if (!isTeacher && event.createdBy !== user.sub) {
        throw new NotFoundException('Evento não encontrado');
      }
    }

    return event;
  }

  /**
   * Atualiza um evento
   */
  async update(id: string, updateDto: UpdateDiaryEventDto, user: JwtPayload) {
    const event = await this.findOne(id, user);

    const canEdit =
      event.createdBy === user.sub ||
      user.roles.some(
        (role) =>
          role.level === RoleLevel.DEVELOPER ||
          role.level === RoleLevel.MANTENEDORA ||
          role.level === RoleLevel.UNIDADE,
      );

    if (!canEdit) {
      throw new ForbiddenException('Você não tem permissão para editar este evento');
    }

    let nextEventDate: Date | undefined;
    if (updateDto.eventDate) {
      nextEventDate = new Date(updateDto.eventDate);
      const todayPed = getPedagogicalDay(new Date());
      const eventPed = getPedagogicalDay(nextEventDate);
      if (eventPed > todayPed) {
        throw new BadRequestException(
          `Não é permitido registrar eventos em datas futuras (${formatPedagogicalDate(nextEventDate)}).`,
        );
      }

      if (event.unitId) {
        const unit = await this.prisma.unit.findUnique({
          where: { id: event.unitId },
          select: { nonSchoolDays: true },
        });
        assertSchoolDay(nextEventDate, unit?.nonSchoolDays ?? [], BadRequestException);
      }
    }

    // GATES DE PUBLICAÇÃO NO UPDATE (segurança produção):
    // Se o PATCH está promovendo o diário para PUBLICADO, aplicar os mesmos gates do create.
    const isBeingPublished =
      updateDto.status === 'PUBLICADO' &&
      (event.status as string) !== 'PUBLICADO';
    if (isBeingPublished) {
      // Gate: plano aprovado obrigatório
      const planId = updateDto.planningId ?? event.planningId;
      if (!planId) {
        throw new BadRequestException(
          'A publicação do Diário do Dia exige um plano de aula aprovado vinculado ao dia.',
        );
      }
      // Gate: avaliação da execução obrigatória
      const ctxUpdate = (updateDto.aiContext ?? event.aiContext) as Record<string, any> | null;
      const avaliacaoPreenchida =
        ctxUpdate?.avaliacaoPlanoAula?.toString().trim() ||
        ctxUpdate?.statusExecucaoPlano?.toString().trim();
      if (!avaliacaoPreenchida) {
        throw new BadRequestException(
          'A publicação do Diário do Dia exige a Avaliação do Plano de Aula preenchida.',
        );
      }
    }

    const updatedEvent = await this.prisma.diaryEvent.update({
      where: { id },
      data: {
        ...(updateDto.type && { type: updateDto.type }),
        ...(updateDto.title && { title: updateDto.title }),
        ...(updateDto.description && { description: updateDto.description }),
        ...(nextEventDate && { eventDate: nextEventDate }),
        ...(updateDto.planningId !== undefined && { planningId: updateDto.planningId }),
        ...(updateDto.tags && { tags: updateDto.tags }),
        ...(updateDto.aiContext && { aiContext: updateDto.aiContext }),
        ...(updateDto.mediaUrls && { mediaUrls: updateDto.mediaUrls }),
        // PR 141: campos críticos do diário oficial ausentes no PATCH anterior
        ...(updateDto.observations !== undefined && { observations: updateDto.observations }),
        ...(updateDto.developmentNotes !== undefined && { developmentNotes: updateDto.developmentNotes }),
        ...(updateDto.behaviorNotes !== undefined && { behaviorNotes: updateDto.behaviorNotes }),
        ...(updateDto.presencas !== undefined && { presencas: updateDto.presencas }),
        ...(updateDto.ausencias !== undefined && { ausencias: updateDto.ausencias }),
        ...(updateDto.status && { status: updateDto.status }),
      },
      include: {
        child: { select: { id: true, firstName: true, lastName: true } },
        classroom: { select: { id: true, name: true } },
        createdByUser: { select: { id: true, firstName: true, lastName: true, email: true } },
      },
    });

    await this.auditService.logUpdate(
      'DiaryEvent',
      id,
      user.sub,
      event.mantenedoraId,
      event.unitId,
      event,
      updatedEvent,
    );

    return updatedEvent;
  }

  /**
   * Remove um evento (soft delete via status)
   */
  async remove(id: string, user: JwtPayload) {
    const event = await this.findOne(id, user);

    const canDelete =
      event.createdBy === user.sub ||
      user.roles.some(
        (role) =>
          role.level === RoleLevel.DEVELOPER ||
          role.level === RoleLevel.MANTENEDORA ||
          role.level === RoleLevel.UNIDADE,
      );

    if (!canDelete) {
      throw new ForbiddenException('Você não tem permissão para remover este evento');
    }

    await this.prisma.diaryEvent.delete({ where: { id } });

    await this.auditService.logDelete(
      'DiaryEvent',
      id,
      user.sub,
      event.mantenedoraId,
      event.unitId,
    );

    return { message: 'Evento removido com sucesso' };
  }

  // ─── Helpers privados ────────────────────────────────────────────────────

  private async validateUserAccess(user: JwtPayload, classroom: any) {
    const isDev = user.roles.some((r) => r.level === RoleLevel.DEVELOPER);
    if (isDev) return;

    const isMantenedora = user.roles.some((r) => r.level === RoleLevel.MANTENEDORA);
    if (isMantenedora) {
      if (classroom.unit.mantenedoraId !== user.mantenedoraId) {
        throw new ForbiddenException('Acesso negado a esta unidade');
      }
      return;
    }

    const isStaff = user.roles.some((r) => r.level === RoleLevel.STAFF_CENTRAL);
    if (isStaff) {
      const staffRole = user.roles.find((r) => r.level === RoleLevel.STAFF_CENTRAL);
      if (!staffRole?.unitScopes?.includes(classroom.unitId)) {
        throw new ForbiddenException('Acesso negado a esta unidade');
      }
      return;
    }

    const isUnidade = user.roles.some((r) => r.level === RoleLevel.UNIDADE);
    if (isUnidade) {
      if (classroom.unitId !== user.unitId) {
        throw new ForbiddenException('Acesso negado a esta turma');
      }
      return;
    }

    const isProfessor = user.roles.some((r) => r.level === RoleLevel.PROFESSOR);
    if (isProfessor) {
      // Verificar se é professor da turma OU se a turma pertence à mesma mantenedora.
      // Permite registrar ocorrência via fallback de matrícula mesmo sem classroomTeacher formal.
      const isTeacher = await this.prisma.classroomTeacher.findFirst({
        where: { classroomId: classroom.id, teacherId: user.sub, isActive: true },
      });
      if (!isTeacher) {
        // Fallback: turma deve pertencer à mesma mantenedora do professor
        if (classroom.unit.mantenedoraId !== user.mantenedoraId) {
          throw new ForbiddenException('Você não tem acesso a esta turma');
        }
      }
      return;
    }

    throw new ForbiddenException('Acesso negado');
  }

  async uploadMedia(id: string, file: Express.Multer.File, user: JwtPayload): Promise<{ mediaUrls: string[] }> {
    if (!file) throw new BadRequestException('Arquivo obrigatório');
    if (file.size > 5 * 1024 * 1024) {
      throw new BadRequestException('Arquivo muito grande (máx. 5 MB)');
    }

    const event = await this.prisma.diaryEvent.findUnique({
      where: { id },
      include: {
        classroom: {
          select: {
            id: true,
            unitId: true,
            unit: {
              select: {
                id: true,
                mantenedoraId: true,
              },
            },
          },
        },
      },
    });

    if (!event) {
      throw new NotFoundException('Evento não encontrado');
    }

    const isDeveloper = user.roles.some((role) => role.level === RoleLevel.DEVELOPER);
    if (!isDeveloper) {
      const isMantenedora = user.roles.some((role) => role.level === RoleLevel.MANTENEDORA);
      if (isMantenedora && event.mantenedoraId !== user.mantenedoraId) {
        throw new ForbiddenException('Acesso negado');
      }

      const isStaffCentral = user.roles.some((role) => role.level === RoleLevel.STAFF_CENTRAL);
      if (isStaffCentral) {
        const staffRole = user.roles.find((role) => role.level === RoleLevel.STAFF_CENTRAL);
        const scopes = staffRole?.unitScopes ?? [];
        const hasScopedAccess = scopes.length > 0
          ? scopes.includes(event.unitId)
          : Boolean(user.unitId && event.unitId === user.unitId);

        if (!hasScopedAccess || event.mantenedoraId !== user.mantenedoraId) {
          throw new ForbiddenException('Acesso negado');
        }
      }

      const isUnidade = user.roles.some((role) => role.level === RoleLevel.UNIDADE);
      if (isUnidade && event.unitId !== user.unitId) {
        throw new ForbiddenException('Acesso negado');
      }

      const isProfessor = user.roles.some((role) => role.level === RoleLevel.PROFESSOR);
      if (isProfessor) {
        const isTeacherOfClassroom = await this.prisma.classroomTeacher.findFirst({
          where: {
            classroomId: event.classroomId,
            teacherId: user.sub,
            isActive: true,
          },
        });

        if (!isTeacherOfClassroom) {
          throw new ForbiddenException('Acesso negado');
        }
      }
    }

    const base64 = file.buffer.toString('base64');
    const dataUrl = `data:${file.mimetype};base64,${base64}`;
    const existing: string[] = Array.isArray(event.mediaUrls)
      ? (event.mediaUrls as string[])
      : [];
    const mediaUrls = [...existing, dataUrl];

    await this.prisma.diaryEvent.update({ where: { id }, data: { mediaUrls } });

    return { mediaUrls };
  }

  private diffInMonths(dateOfBirth: Date, referenceDate: Date): number {
    const dob = new Date(dateOfBirth);
    const ref = new Date(referenceDate);
    return (
      (ref.getFullYear() - dob.getFullYear()) * 12 +
      (ref.getMonth() - dob.getMonth())
    );
  }

  private inferSegmentFromClassroom(ageGroupMin: number, ageGroupMax: number): string {
    const midpoint = (ageGroupMin + ageGroupMax) / 2;
    if (midpoint <= 18) return 'EI01';
    if (midpoint <= 47) return 'EI02';
    return 'EI03';
  }
}
