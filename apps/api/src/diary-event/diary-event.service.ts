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

    // Validar se a criança existe e pertence à turma
    const child = await this.prisma.child.findUnique({
      where: { id: createDto.childId },
      include: {
        enrollments: {
          where: {
            classroomId: createDto.classroomId,
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
      where: { id: createDto.classroomId },
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

    // VALIDAÇÃO OPCIONAL: Planning (somente se planningId fornecido)
    if (createDto.planningId) {
      const planning = await this.prisma.planning.findUnique({
        where: { id: createDto.planningId },
        include: { classroom: true, curriculumMatrix: true },
      });

      if (!planning) {
        throw new NotFoundException('Planejamento não encontrado');
      }

      if (planning.status === PlanningStatus.CANCELADO) {
        throw new BadRequestException('Planejamento cancelado não pode receber eventos');
      }

      const planningStart = new Date(planning.startDate);
      const planningEnd = new Date(planning.endDate);
      if (eventDate < planningStart || eventDate > planningEnd) {
        throw new BadRequestException(
          `A data do evento (${formatPedagogicalDate(eventDate)}) deve estar dentro do período do planejamento (${formatPedagogicalDate(planningStart)} - ${formatPedagogicalDate(planningEnd)})`,
        );
      }

      if (planning.classroomId !== createDto.classroomId) {
        throw new BadRequestException('O planejamento não pertence à turma informada');
      }
    }

    // VALIDAÇÃO OPCIONAL: CurriculumEntry (somente se curriculumEntryId fornecido)
    if (createDto.curriculumEntryId) {
      const entry = await this.prisma.curriculumMatrixEntry.findUnique({
        where: { id: createDto.curriculumEntryId },
      });
      if (!entry) {
        throw new NotFoundException('Entrada da matriz curricular não encontrada');
      }
    }

    // Validação de segmento etário (sempre aplicada)
    const ageMonths = this.diffInMonths(child.dateOfBirth, eventDate);
    if (ageMonths < classroom.ageGroupMin || ageMonths > classroom.ageGroupMax) {
      throw new BadRequestException(
        `Segmento incompatível: criança com ${ageMonths} meses fora do intervalo da turma (${classroom.ageGroupMin}-${classroom.ageGroupMax} meses).`,
      );
    }

    // Criar o evento
    const diaryEvent = await this.prisma.diaryEvent.create({
      data: {
        type: createDto.type,
        title: createDto.title,
        description: createDto.description,
        eventDate,
        childId: createDto.childId,
        classroomId: createDto.classroomId,
        ...(createDto.planningId ? { planningId: createDto.planningId } : {}),
        ...(createDto.curriculumEntryId ? { curriculumEntryId: createDto.curriculumEntryId } : {}),

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
        createdBy: user.sub,
        mantenedoraId: classroom.unit.mantenedoraId,
        unitId: classroom.unitId,
      },
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
   * Lista eventos com filtros
   */
  async findAll(query: QueryDiaryEventDto, user: JwtPayload) {
    const where: any = {};

    if (!user.roles.some((role) => role.level === RoleLevel.DEVELOPER)) {
      if (user.roles.some((role) => role.level === RoleLevel.MANTENEDORA)) {
        where.mantenedoraId = user.mantenedoraId;
      } else if (user.roles.some((role) => role.level === RoleLevel.STAFF_CENTRAL)) {
        const staffRole = user.roles.find((role) => role.level === RoleLevel.STAFF_CENTRAL);
        where.unitId = { in: staffRole?.unitScopes || [] };
      } else if (user.roles.some((role) => role.level === RoleLevel.UNIDADE)) {
        where.unitId = user.unitId;
      } else if (user.roles.some((role) => role.level === RoleLevel.PROFESSOR)) {
        const classrooms = await this.prisma.classroomTeacher.findMany({
          where: { teacherId: user.sub, isActive: true },
          select: { classroomId: true },
        });
        where.classroomId = { in: classrooms.map((ct) => ct.classroomId) };
      }
    }

    if (query.childId) where.childId = query.childId;
    if (query.classroomId) where.classroomId = query.classroomId;
    if (query.unitId) where.unitId = query.unitId;
    if (query.type) where.type = query.type;
    if (query.createdBy) where.createdBy = query.createdBy;

    if (query.startDate || query.endDate) {
      where.eventDate = {};
      if (query.startDate) where.eventDate.gte = new Date(query.startDate);
      if (query.endDate) where.eventDate.lte = new Date(query.endDate);
    }

    const events = await this.prisma.diaryEvent.findMany({
      where,
      include: {
        child: { select: { id: true, firstName: true, lastName: true } },
        classroom: { select: { id: true, name: true } },
        createdByUser: { select: { id: true, firstName: true, lastName: true, email: true } },
      },
      orderBy: { eventDate: 'desc' },
    });

    return events;
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
      const isTeacher = await this.prisma.classroomTeacher.findFirst({
        where: { classroomId: event.classroomId, teacherId: user.sub, isActive: true },
      });
      if (!isTeacher) throw new NotFoundException('Evento não encontrado');
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

    const updatedEvent = await this.prisma.diaryEvent.update({
      where: { id },
      data: {
        ...(updateDto.type && { type: updateDto.type }),
        ...(updateDto.title && { title: updateDto.title }),
        ...(updateDto.description && { description: updateDto.description }),
        ...(updateDto.eventDate && { eventDate: new Date(updateDto.eventDate) }),
        ...(updateDto.planningId !== undefined && { planningId: updateDto.planningId }),
        ...(updateDto.tags && { tags: updateDto.tags }),
        ...(updateDto.aiContext && { aiContext: updateDto.aiContext }),
        ...(updateDto.mediaUrls && { mediaUrls: updateDto.mediaUrls }),
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
      const isTeacher = await this.prisma.classroomTeacher.findFirst({
        where: { classroomId: classroom.id, teacherId: user.sub, isActive: true },
      });
      if (!isTeacher) {
        throw new ForbiddenException('Você não é professor desta turma');
      }
      return;
    }

    throw new ForbiddenException('Acesso negado');
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
