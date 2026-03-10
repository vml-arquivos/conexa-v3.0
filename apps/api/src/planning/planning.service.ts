import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../common/services/audit.service';
import { CreatePlanningDto } from './dto/create-planning.dto';
import { UpdatePlanningDto } from './dto/update-planning.dto';
import { ChangeStatusDto } from './dto/change-status.dto';
import { QueryPlanningDto } from './dto/query-planning.dto';
import type { JwtPayload } from '../auth/interfaces/jwt-payload.interface';
import { getScopedWhereForPlanning } from './planning-scope.helper';
import { maskMatrizEntryForProfessor } from '../common/helpers/masking.helper';
import { RoleLevel, PlanningStatus, AuditLogAction } from '@prisma/client';
import { assertSchoolDay } from '../common/utils/date.utils';

@Injectable()
export class PlanningService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  /**
   * Cria um planejamento inteligente a partir de um template,
   * pré-preenchendo com dados da matriz curricular
   */
  async createFromTemplate(
    dto: { templateId: string; classroomId: string; date: string },
    user: JwtPayload,
  ) {
    // 1. Validar template
    const template = await this.prisma.planningTemplate.findUnique({
      where: { id: dto.templateId },
    });

    if (!template) {
      throw new NotFoundException('Template não encontrado');
    }

    // 2. Validar classroom
    const classroom = await this.prisma.classroom.findUnique({
      where: { id: dto.classroomId },
      include: {
        unit: true,
      },
      // ageGroupMin/Max são campos diretos do Classroom, retornados automaticamente
    });

    if (!classroom) {
      throw new NotFoundException('Turma não encontrada');
    }

    // 3. Buscar matriz curricular ativa da mantenedora
    // FIX C3.2: filtrar por segment derivado da turma para pegar a matriz correta
    const ageGroupMin = classroom.ageGroupMin ?? 0;
    let segment: string | null = null;
    if (ageGroupMin <= 18) segment = 'EI01';
    else if (ageGroupMin <= 47) segment = 'EI02';
    else if (ageGroupMin <= 71) segment = 'EI03';
    const matrizWhere: Record<string, unknown> = {
      mantenedoraId: user.mantenedoraId,
      isActive: true,
    };
    if (segment) matrizWhere['segment'] = segment;
    const matriz = await this.prisma.curriculumMatrix.findFirst({
      where: matrizWhere as any,
      orderBy: { year: 'desc' },
    });

    if (!matriz) {
      throw new NotFoundException(
        `Matriz curricular ativa não encontrada para sua mantenedora${segment ? ` (segmento ${segment})` : ''}`,
      );
    }

    // 4. Buscar entrada da matriz para a data
    // FIX C3.1: usar intervalo UTC do dia para cobrir tanto T00:00Z (new Date('YYYY-MM-DD'))
    // quanto T03:00Z (parser com offset -03:00). Date.UTC garante independência de timezone do servidor.
    const targetDate = new Date(dto.date);
    const dateParts = dto.date.split('-').map(Number);
    const dayStart = new Date(Date.UTC(dateParts[0], dateParts[1] - 1, dateParts[2], 0, 0, 0, 0));
    const dayEnd   = new Date(Date.UTC(dateParts[0], dateParts[1] - 1, dateParts[2], 23, 59, 59, 999));
    const matrixEntry = await this.prisma.curriculumMatrixEntry.findFirst({
      where: {
        matrixId: matriz.id,
        date: { gte: dayStart, lte: dayEnd },
      },
    });

    // 5. Montar dados do planejamento
    let title = `${template.name} - ${classroom.name} - ${targetDate.toLocaleDateString('pt-BR')}`;
    let description = template.description || '';
    let content: any = {};

    if (matrixEntry) {
      title = `${matrixEntry.campoDeExperiencia} - ${classroom.name} - ${targetDate.toLocaleDateString('pt-BR')}`;
      description = matrixEntry.intencionalidade || '';
      content = {
        campoDeExperiencia: matrixEntry.campoDeExperiencia,
        objetivoBNCCCode: matrixEntry.objetivoBNCCCode,
        objetivoBNCC: matrixEntry.objetivoBNCC,
        objetivoCurriculo: matrixEntry.objetivoCurriculo,
        intencionalidade: matrixEntry.intencionalidade,
        exemploAtividade: matrixEntry.exemploAtividade,
        weekOfYear: matrixEntry.weekOfYear,
        bimester: matrixEntry.bimester,
        activities: '',
        materials: '',
        evaluation: '',
      };
    } else {
      content = {
        campoDeExperiencia: '',
        objetivoBNCCCode: '',
        objetivoBNCC: '',
        objetivoCurriculo: '',
        intencionalidade: '',
        exemploAtividade: '',
        activities: '',
        materials: '',
        evaluation: '',
      };
    }

    // 6. Criar planejamento
    const planning = await this.prisma.planning.create({
      data: {
        mantenedoraId: user.mantenedoraId,
        unitId: classroom.unitId,
        classroomId: classroom.id,
        type: 'SEMANAL',
        // FIX C3.3: createdBy deve ser user.sub (User.id), não email
        createdBy: user.sub,
        templateId: template.id,
        curriculumMatrixId: matriz.id,
        title,
        description,
        pedagogicalContent: content,
        startDate: targetDate,
        endDate: targetDate,
        status: PlanningStatus.RASCUNHO,
      },
      include: {
        classroom: true,
        template: true,
      },
    });

    // 7. Auditar
    await this.auditService.log({
      userId: user.sub,
      mantenedoraId: user.mantenedoraId,
      action: AuditLogAction.CREATE,
      entity: 'Planning',
      entityId: planning.id,
      description: `Planejamento criado a partir do template ${template.name} para data ${dto.date}`,
    });

    return maskMatrizEntryForProfessor(user, planning);
  }

  /**
   * Cria um novo planejamento
   */
  async create(createDto: CreatePlanningDto, user: JwtPayload) {
    // Validar se o template existe (opcional agora)
    if (createDto.templateId) {
      const template = await this.prisma.planningTemplate.findUnique({
        where: { id: createDto.templateId },
      });

      if (!template) {
        throw new NotFoundException('Template não encontrado');
      }
    }

    // Validar se a matriz curricular existe (opcional)
    if (createDto.curriculumMatrixId) {
      const matrix = await this.prisma.curriculumMatrix.findUnique({
        where: { id: createDto.curriculumMatrixId },
      });

      if (!matrix) {
        throw new NotFoundException('Matriz curricular não encontrada');
      }

      if (!matrix.isActive) {
        throw new BadRequestException('Matriz curricular não está ativa');
      }
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

    // Validar permissão
    await this.validateCreatePermission(classroom, user);

    // Validar datas
    const startDate = new Date(createDto.startDate);
    const endDate = new Date(createDto.endDate);

    if (startDate > endDate) {
      throw new BadRequestException(
        'A data de início deve ser anterior à data de término',
      );
    }

    // BLOQUEIO DE DIA NÃO LETIVO: startDate deve ser dia letivo
    // Planejamentos não podem iniciar em fins de semana ou feriados configurados
    if (user.unitId) {
      const unit = await this.prisma.unit.findUnique({
        where: { id: user.unitId },
        select: { nonSchoolDays: true },
      });
      assertSchoolDay(startDate, unit?.nonSchoolDays ?? [], BadRequestException);
    }

    // Verificar se já existe um planejamento ACTIVE para a turma no período
    const existingActivePlanning = await this.prisma.planning.findFirst({
      where: {
        classroomId: createDto.classroomId,
        status: PlanningStatus.EM_EXECUCAO,
        OR: [
          {
            AND: [
              { startDate: { lte: endDate } },
              { endDate: { gte: startDate } },
            ],
          },
        ],
      },
    });

    if (existingActivePlanning) {
      throw new ConflictException(
        'Já existe um planejamento ativo para esta turma no período especificado',
      );
    }

    const planning = await this.prisma.planning.create({
      data: {
        title: createDto.title,
        description: createDto.description,
        type: (createDto.type ?? 'SEMANAL') as import('@prisma/client').PlanningType,
        templateId: createDto.templateId,
        curriculumMatrixId: createDto.curriculumMatrixId, // NOVO
        classroomId: createDto.classroomId,
        startDate,
        endDate,
        // Campos legados
        // objectives pode chegar como string JSON (novo formato) ou objeto (legado)
        objectives: createDto.objectives
          ? typeof createDto.objectives === 'string'
            ? createDto.objectives
            : JSON.stringify(createDto.objectives)
          : null,
        activities: createDto.activities,
        resources: createDto.resources,
        evaluation: createDto.evaluation,
        bnccAreas: createDto.bnccAreas,
        curriculumAlignment: createDto.curriculumAlignment,
        // NOVO: Conteúdo pedagógico de autoria docente
        pedagogicalContent: createDto.pedagogicalContent,
        status: PlanningStatus.RASCUNHO,
        createdBy: user.sub,
        // Campos de rastreabilidade
        anoLetivo: startDate.getFullYear(),
        professorId: user.sub,
        mantenedoraId: classroom.unit.mantenedoraId,
        unitId: classroom.unitId,
      },
      include: {
        template: {
          select: {
            id: true,
            name: true,
          },
        },
        classroom: {
          select: {
            id: true,
            name: true,
          },
        },
        createdByUser: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    });

    // Registrar auditoria
    await this.auditService.logCreate(
      'Planning',
      planning.id,
      user.sub,
      classroom.unit.mantenedoraId,
      classroom.unitId,
      planning,
    );

    return maskMatrizEntryForProfessor(user, planning);
  }

  /**
   * Lista planejamentos com filtros
   */
  async findAll(query: QueryPlanningDto, user: JwtPayload) {
    const where: any = {};

    // Filtro por escopo do usuário
    if (!user.roles.some((role) => role.level === RoleLevel.DEVELOPER)) {
      // Mantenedora: acessa tudo da mantenedora
      if (user.roles.some((role) => role.level === RoleLevel.MANTENEDORA)) {
        where.mantenedoraId = user.mantenedoraId;
      }
      // Staff Central (Coord. Geral): acessa apenas unidades vinculadas
      // RBAC HARD: Coord. Geral só pode ver planejamentos APROVADOS
      else if (
        user.roles.some((role) => role.level === RoleLevel.STAFF_CENTRAL)
      ) {
        const staffRole = user.roles.find(
          (role) => role.level === RoleLevel.STAFF_CENTRAL,
        );
        const staffScopes = staffRole?.unitScopes ?? [];
        // Se unitScopes preenchido, restringir; se vazio, acessa todas as unidades da mantenedora
        if (staffScopes.length > 0) {
          where.unitId = { in: staffScopes };
        } else {
          where.mantenedoraId = user.mantenedoraId;
        }
        // Aplicar filtro de APROVADO apenas se não houver filtro de status explícito na query
        if (!query.status) {
          where.status = PlanningStatus.APROVADO;
        }
      }
      // Unidade: acessa apenas sua unidade
      else if (user.roles.some((role) => role.level === RoleLevel.UNIDADE)) {
        where.unitId = user.unitId;
      }
      // Professor: acessa planejamentos criados por ele OU de turmas que leciona
      // Usa OR para garantir que mesmo sem turma vinculada, o professor vê seus próprios planejamentos
      else if (user.roles.some((role) => role.level === RoleLevel.PROFESSOR)) {
        const classrooms = await this.prisma.classroomTeacher.findMany({
          where: {
            teacherId: user.sub,
            isActive: true,
          },
          select: { classroomId: true },
        });
        const classroomIds = classrooms.map((ct) => ct.classroomId);
        // OR: planejamentos criados por este professor OU de turmas que ele leciona
        where.OR = [
          { createdBy: user.sub },
          ...(classroomIds.length > 0 ? [{ classroomId: { in: classroomIds } }] : []),
        ];
      }
    }

    // Aplicar filtros da query
    if (query.classroomId) {
      where.classroomId = query.classroomId;
    }

    if (query.unitId) {
      where.unitId = query.unitId;
    }

    if (query.templateId) {
      where.templateId = query.templateId;
    }

    if (query.status) {
      where.status = query.status;
    }

    if (query.type) {
      where.template = {
        type: query.type,
      };
    }

    // Filtro por período: interseção de períodos
    // Retorna planejamentos que cobrem qualquer parte do período consultado:
    //   planning.startDate <= query.endDate AND planning.endDate >= query.startDate
    if (query.startDate || query.endDate) {
      where.AND = where.AND ?? [];
      if (query.startDate && query.endDate) {
        where.AND.push({ startDate: { lte: new Date(query.endDate + 'T23:59:59.999Z') } });
        where.AND.push({ endDate: { gte: new Date(query.startDate) } });
      } else if (query.startDate) {
        where.AND.push({ endDate: { gte: new Date(query.startDate) } });
      } else if (query.endDate) {
        where.AND.push({ startDate: { lte: new Date(query.endDate + 'T23:59:59.999Z') } });
      }
    }

    const plannings = await this.prisma.planning.findMany({
      where,
      include: {
        template: {
          select: {
            id: true,
            name: true,
          },
        },
        classroom: {
          select: {
            id: true,
            name: true,
          },
        },
        createdByUser: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        _count: {
          select: {
            diaryEvents: true,
          },
        },
      },
      orderBy: {
        startDate: 'desc',
      },
    });

    return plannings.map(p => maskMatrizEntryForProfessor(user, p));
  }

  /**
   * Busca um planejamento por ID
   */
  async findOne(id: string, user: JwtPayload) {
    const scopedWhere = getScopedWhereForPlanning(user);

    const planning = await this.prisma.planning.findFirst({
      where: {
        id,
        ...scopedWhere,
      },
      include: {
        template: true,
        classroom: true,
        createdByUser: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        _count: {
          select: {
            diaryEvents: true,
          },
        },
      },
    });

    if (!planning) {
      throw new NotFoundException('Planejamento não encontrado');
    }

    // Para PROFESSOR, validar se é professor da turma
    if (user.roles.some((role) => role.level === RoleLevel.PROFESSOR)) {
      const isTeacher = await this.prisma.classroomTeacher.findFirst({
        where: {
          classroomId: planning.classroomId,
          teacherId: user.sub,
          isActive: true,
        },
      });

      if (!isTeacher) {
        throw new NotFoundException('Planejamento não encontrado');
      }
    }

    return maskMatrizEntryForProfessor(user, planning);
  }

  /**
   * Atualiza um planejamento
   */
  async update(id: string, updateDto: UpdatePlanningDto, user: JwtPayload) {
    // Buscar planejamento com escopo
    const planning = await this.findOne(id, user);

    // Validar se pode editar
    if (planning.status === PlanningStatus.CONCLUIDO || planning.status === PlanningStatus.APROVADO) {
      throw new ForbiddenException(
        `Planejamentos com status '${planning.status}' não podem ser editados diretamente.`,
      );
    }

    // BUG E FIX: Bloquear edição de planejamentos cujo período já passou.
    // Professores não podem editar planejamentos com endDate anterior a hoje,
    // independentemente do status. Apenas DEV e MANTENEDORA podem corrigir dados históricos.
    const isProfessor = user.roles.some((role) => role.level === RoleLevel.PROFESSOR);
    const isCoordinator = user.roles.some((role) => role.level === RoleLevel.UNIDADE);
    if (isProfessor || isCoordinator) {
      const hoje = new Date();
      hoje.setUTCHours(0, 0, 0, 0);
      const endDate = new Date(planning.endDate);
      endDate.setUTCHours(0, 0, 0, 0);
      if (endDate < hoje) {
        throw new ForbiddenException(
          'Planejamentos de períodos já encerrados não podem ser editados. O período deste planejamento já passou.',
        );
      }
    }

    // REGRAS DE EDIÇÃO POR STATUS E ROLE
    // (isProfessor e isCoordinator já declarados acima)

    if (isProfessor) {
        // Professor só pode editar RASCUNHO ou DEVOLVIDO
        if (planning.status !== PlanningStatus.RASCUNHO && planning.status !== PlanningStatus.DEVOLVIDO) {
            throw new ForbiddenException(`Professores não podem editar planejamentos com status '${planning.status}'.`);
        }
    } else if (isCoordinator) {
        // Coordenador pode editar RASCUNHO, DEVOLVIDO e EM_REVISAO
        const statusEditaveisCoord: PlanningStatus[] = [PlanningStatus.RASCUNHO, PlanningStatus.DEVOLVIDO, PlanningStatus.EM_REVISAO];
        if (!statusEditaveisCoord.includes(planning.status)) {
            throw new ForbiddenException(`Coordenadores não podem editar planejamentos com status '${planning.status}'.`);
        }
    } else {
        // Apenas DEV e MANTENEDORA podem editar livremente
        // (status APROVADO já foi bloqueado no início do método)
        const canEdit = user.roles.some(r => r.level === RoleLevel.DEVELOPER || r.level === RoleLevel.MANTENEDORA);
        if (!canEdit) {
            throw new ForbiddenException(`Seu perfil não tem permissão para editar este planejamento.`);
        }
    }

    // Validar datas se fornecidas
    if (updateDto.startDate || updateDto.endDate) {
      const startDate = updateDto.startDate
        ? new Date(updateDto.startDate)
        : planning.startDate;
      const endDate = updateDto.endDate
        ? new Date(updateDto.endDate)
        : planning.endDate;

      if (startDate > endDate) {
        throw new BadRequestException(
          'A data de início deve ser anterior à data de término',
        );
      }
    }

    const updatedPlanning = await this.prisma.planning.update({
      where: { id },
      data: {
        // Campos de conteúdo docente
        ...(updateDto.title !== undefined && { title: updateDto.title }),
        ...(updateDto.description !== undefined && { description: updateDto.description }),
        ...(updateDto.type !== undefined && { type: updateDto.type as import('@prisma/client').PlanningType }),
        ...(updateDto.classroomId !== undefined && { classroomId: updateDto.classroomId }),
        ...(updateDto.pedagogicalContent !== undefined && { pedagogicalContent: updateDto.pedagogicalContent }),
        // Campos legados
        ...(updateDto.startDate && { startDate: new Date(updateDto.startDate) }),
        ...(updateDto.endDate && { endDate: new Date(updateDto.endDate) }),
        ...(updateDto.objectives && {
          objectives: typeof updateDto.objectives === 'string'
            ? updateDto.objectives
            : JSON.stringify(updateDto.objectives),
        }),
        ...(updateDto.activities && { activities: updateDto.activities }),
        ...(updateDto.resources && { resources: updateDto.resources }),
        ...(updateDto.bnccAreas && { bnccAreas: updateDto.bnccAreas }),
      } as any,
      include: {
        template: true,
        classroom: true,
        createdByUser: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    });

    // Registrar auditoria
    await this.auditService.logUpdate(
      'Planning',
      id,
      user.sub,
      planning.mantenedoraId,
      planning.unitId,
      planning,
      updatedPlanning,
    );

    return maskMatrizEntryForProfessor(user, updatedPlanning);
  }

  /**
   * Altera o status de um planejamento
   */
  async changeStatus(
    id: string,
    changeStatusDto: ChangeStatusDto,
    user: JwtPayload,
  ) {
    // Buscar planejamento com escopo
    const planning = await this.findOne(id, user);

    // Validar transição de status
    this.validateStatusTransition(planning.status, changeStatusDto.status);

    // Professor não pode ativar ou fechar planejamentos
    if (user.roles.some((role) => role.level === RoleLevel.PROFESSOR)) {
      if (
        changeStatusDto.status === PlanningStatus.EM_EXECUCAO ||
        changeStatusDto.status === PlanningStatus.CONCLUIDO
      ) {
        throw new ForbiddenException(
          'Professores não podem ativar ou fechar planejamentos',
        );
      }
    }

    // Se ativando, verificar conflitos
    if (changeStatusDto.status === PlanningStatus.EM_EXECUCAO) {
      const existingActivePlanning = await this.prisma.planning.findFirst({
        where: {
          classroomId: planning.classroomId,
          status: PlanningStatus.EM_EXECUCAO,
          id: { not: id },
          OR: [
            {
              AND: [
                { startDate: { lte: planning.endDate } },
                { endDate: { gte: planning.startDate } },
              ],
            },
          ],
        },
      });

      if (existingActivePlanning) {
        throw new ConflictException(
          'Já existe um planejamento ativo para esta turma no período especificado',
        );
      }
    }

    const updatedPlanning = await this.prisma.planning.update({
      where: { id },
      data: {
        status: changeStatusDto.status,
      },
      include: {
        template: true,
        classroom: true,
        createdByUser: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    });

    // Registrar auditoria
    await this.auditService.log({
      action: AuditLogAction.UPDATE,
      entity: 'PLANNING' as any,
      entityId: id,
      userId: user.sub,
      mantenedoraId: planning.mantenedoraId,
      unitId: planning.unitId,
      changes: {
        statusChange: {
          from: planning.status,
          to: changeStatusDto.status,
        },
      },
    });

    return maskMatrizEntryForProfessor(user, updatedPlanning);
  }

  /**
   * Fecha um planejamento (EM_EXECUCAO → CONCLUIDO)
   */
  async close(id: string, user: JwtPayload) {
    // Buscar planejamento com escopo
    const planning = await this.findOne(id, user);

    // Validar RBAC: Professor não pode fechar
    if (user.roles.some((role) => role.level === RoleLevel.PROFESSOR)) {
      throw new ForbiddenException('Professores não podem fechar planejamentos');
    }

    // Validar status: somente EM_EXECUCAO pode ser fechado
    if (planning.status !== PlanningStatus.EM_EXECUCAO) {
      throw new BadRequestException(
        'Somente planejamentos em execução podem ser fechados',
      );
    }

    const updatedPlanning = await this.prisma.planning.update({
      where: { id },
      data: {
        status: PlanningStatus.CONCLUIDO,
      },
      include: {
        template: true,
        classroom: true,
        createdByUser: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    });

    // Registrar auditoria
    await this.auditService.log({
      action: 'CLOSE' as any,
      entity: 'PLANNING' as any,
      entityId: id,
      userId: user.sub,
      mantenedoraId: planning.mantenedoraId,
      unitId: planning.unitId,
      changes: {
        statusChange: {
          from: planning.status,
          to: PlanningStatus.CONCLUIDO,
        },
      },
    });

    return maskMatrizEntryForProfessor(user, updatedPlanning);
  }

  /**
   * Valida se o usuário tem permissão para criar planejamentos
   */
  private async validateCreatePermission(
    classroom: any,
    user: JwtPayload,
  ): Promise<void> {
    // Developer tem acesso total
    if (user.roles.some((role) => role.level === RoleLevel.DEVELOPER)) {
      return;
    }

    // Mantenedora: validar mantenedoraId
    if (user.roles.some((role) => role.level === RoleLevel.MANTENEDORA)) {
      if (classroom.unit.mantenedoraId !== user.mantenedoraId) {
        throw new ForbiddenException(
          'Você não tem permissão para criar planejamentos nesta turma',
        );
      }
      return;
    }

    // Staff Central: validar se a unidade está no escopo
    if (user.roles.some((role) => role.level === RoleLevel.STAFF_CENTRAL)) {
      const staffRole = user.roles.find(
        (role) => role.level === RoleLevel.STAFF_CENTRAL,
      );
      if (!staffRole?.unitScopes.includes(classroom.unitId)) {
        throw new ForbiddenException(
          'Você não tem permissão para criar planejamentos nesta turma',
        );
      }
      return;
    }

    // Unidade: validar unitId
    if (user.roles.some((role) => role.level === RoleLevel.UNIDADE)) {
      if (classroom.unitId !== user.unitId) {
        throw new ForbiddenException(
          'Você não tem permissão para criar planejamentos nesta turma',
        );
      }
      return;
    }

    // Professor: pode criar planejamentos apenas nas suas próprias turmas
    if (user.roles.some((role) => role.level === RoleLevel.PROFESSOR)) {
      const isTeacherOfClassroom = await this.prisma.classroomTeacher.findFirst({
        where: {
          classroomId: classroom.id,
          teacherId: user.sub,
          isActive: true,
        },
      });
      if (!isTeacherOfClassroom) {
        throw new ForbiddenException(
          'Você não é professor desta turma e não pode criar planejamentos nela.',
        );
      }
      return;
    }

    throw new ForbiddenException(
      'Seu perfil não tem permissão para criar planejamentos.',
    );
  }

  /**
   * Valida se o usuário tem acesso ao planejamento
   */
  private async validateAccess(planning: any, user: JwtPayload): Promise<void> {
    // Developer tem acesso total
    if (user.roles.some((role) => role.level === RoleLevel.DEVELOPER)) {
      return;
    }

    // Mantenedora: validar mantenedoraId
    if (user.roles.some((role) => role.level === RoleLevel.MANTENEDORA)) {
      if (planning.mantenedoraId !== user.mantenedoraId) {
        throw new ForbiddenException('Acesso negado a este planejamento');
      }
      return;
    }

    // Staff Central: validar se a unidade está no escopo
    if (user.roles.some((role) => role.level === RoleLevel.STAFF_CENTRAL)) {
      const staffRole = user.roles.find(
        (role) => role.level === RoleLevel.STAFF_CENTRAL,
      );
      if (!staffRole?.unitScopes.includes(planning.unitId)) {
        throw new ForbiddenException('Acesso negado a este planejamento');
      }
      return;
    }

    // Unidade: validar unitId
    if (user.roles.some((role) => role.level === RoleLevel.UNIDADE)) {
      if (planning.unitId !== user.unitId) {
        throw new ForbiddenException('Acesso negado a este planejamento');
      }
      return;
    }

    // Professor: validar se é professor da turma
    if (user.roles.some((role) => role.level === RoleLevel.PROFESSOR)) {
      const isTeacher = await this.prisma.classroomTeacher.findFirst({
        where: {
          classroomId: planning.classroomId,
          teacherId: user.sub,
          isActive: true,
        },
      });

      if (!isTeacher) {
        throw new ForbiddenException('Acesso negado a este planejamento');
      }
      return;
    }

    throw new ForbiddenException('Acesso negado a este planejamento');
  }

  /**
   * Valida transição de status
   */
  private validateStatusTransition(
    currentStatus: PlanningStatus,
    newStatus: PlanningStatus,
  ): void {
    // DRAFT pode ir para ACTIVE
    if (
      currentStatus === PlanningStatus.RASCUNHO &&
      newStatus === PlanningStatus.EM_EXECUCAO
    ) {
      return;
    }

    // ACTIVE pode ir para CLOSED
    if (
      currentStatus === PlanningStatus.EM_EXECUCAO &&
      newStatus === PlanningStatus.CONCLUIDO
    ) {
      return;
    }

    // ACTIVE pode voltar para DRAFT
    if (
      currentStatus === PlanningStatus.EM_EXECUCAO &&
      newStatus === PlanningStatus.RASCUNHO
    ) {
      return;
    }

    // CLOSED não pode mudar de status
    if (currentStatus === PlanningStatus.CONCLUIDO) {
      throw new BadRequestException(
        'Planejamentos fechados não podem ter o status alterado',
      );
    }

    throw new BadRequestException(
      `Transição de status inválida: ${currentStatus} → ${newStatus}`,
    );
  }

  // --- FLUXO DE REVISÃO ---

  /**
   * Envia um planejamento para revisão (RASCUNHO/DEVOLVIDO -> EM_REVISAO)
   */
  async submitForReview(id: string, user: JwtPayload) {
    const planning = await this.findOne(id, user);

    // 1. Validar permissão: apenas o professor que criou pode enviar
    if (planning.createdBy !== user.sub) {
        throw new ForbiddenException("Você não tem permissão para enviar este planejamento para revisão.");
    }

    // 2. Validar status: só pode enviar se estiver em RASCUNHO ou DEVOLVIDO
    if (planning.status !== PlanningStatus.RASCUNHO && planning.status !== PlanningStatus.DEVOLVIDO) {
        throw new BadRequestException(`Planejamentos com status ${planning.status} não podem ser enviados para revisão.`);
    }

    // BUG E FIX: Não permitir envio para revisão de planejamentos com período já encerrado.
    const hoje = new Date();
    hoje.setUTCHours(0, 0, 0, 0);
    const endDate = new Date(planning.endDate);
    endDate.setUTCHours(0, 0, 0, 0);
    if (endDate < hoje) {
        throw new ForbiddenException(
          'Não é possível enviar para revisão um planejamento cujo período já encerrou.',
        );
    }

    // 3. Atualizar status e registrar data de submissão
    const updatedPlanning = await this.prisma.planning.update({
        where: { id },
        data: {
            status: PlanningStatus.EM_REVISAO,
            submittedAt: new Date(),
        },
    });

    // 4. Registrar auditoria
    await this.auditService.log({
        action: AuditLogAction.SUBMIT_REVIEW,
        entity: 'PLANNING',
        entityId: id,
        userId: user.sub,
        mantenedoraId: planning.mantenedoraId,
        unitId: planning.unitId,
    });

    return maskMatrizEntryForProfessor(user, updatedPlanning);
  }

  /**
   * Aprova um planejamento (EM_REVISAO -> APROVADO)
   */
  async approve(id: string, user: JwtPayload) {
    // Apenas coordenação/direção pode aprovar
    const planning = await this.findOne(id, user); // findOne já valida o escopo da unidade/mantenedor

    // Validar se pode aprovar
    if (planning.status !== PlanningStatus.EM_REVISAO) {
      throw new BadRequestException(
        `Apenas planejamentos com status EM_REVISAO podem ser aprovados.`,
      );
    }

    // RBAC: Apenas UNIDADE pode aprovar
    const isCoordinator = user.roles.some((role) => role.level === RoleLevel.UNIDADE);
    if (!isCoordinator) {
        throw new ForbiddenException(`Apenas a Coordenação da Unidade pode aprovar planejamentos.`);
    }

    const updatedPlanning = await this.prisma.planning.update({
        where: { id },
        data: {
            status: PlanningStatus.APROVADO,
            reviewedAt: new Date(),
            reviewedBy: user.sub,
        },
    });

    await this.auditService.log({
        action: AuditLogAction.APPROVE_PLANNING,
        entity: 'PLANNING',
        entityId: id,
        userId: user.sub,
        mantenedoraId: planning.mantenedoraId,
        unitId: planning.unitId,
    });

    return maskMatrizEntryForProfessor(user, updatedPlanning);
  }

  /**
   * Devolve um planejamento para correções (EM_REVISAO -> DEVOLVIDO)
   */
  async returnForCorrections(id: string, dto: { comment: string }, user: JwtPayload) {
    // RBAC: Apenas UNIDADE pode devolver
    const isCoordinator = user.roles.some((role) => role.level === RoleLevel.UNIDADE);
    if (!isCoordinator) {
        throw new ForbiddenException(`Apenas a Coordenação da Unidade pode devolver planejamentos.`);
    }

    const planning = await this.findOne(id, user);

    if (planning.status !== PlanningStatus.EM_REVISAO) {
        throw new BadRequestException(`Apenas planejamentos com status EM_REVISAO podem ser devolvidos.`);
    }

    const updatedPlanning = await this.prisma.planning.update({
        where: { id },
        data: {
            status: PlanningStatus.DEVOLVIDO,
            reviewedAt: new Date(),
            reviewedBy: user.sub,
            reviewComment: dto.comment,
        },
    });

    await this.auditService.log({
        action: AuditLogAction.RETURN_PLANNING,
        entity: 'PLANNING',
        entityId: id,
        userId: user.sub,
        mantenedoraId: planning.mantenedoraId,
        unitId: planning.unitId,
        changes: { comment: dto.comment },
    });

    return maskMatrizEntryForProfessor(user, updatedPlanning);
  }

  /**
   * Verifica quais datas do range já possuem planejamentos para a turma.
   * Retorna: { occupied: string[], nextFreeDate: string }
   * occupied: lista de datas YYYY-MM-DD com planejamento existente
   * nextFreeDate: próxima data livre após o range
   */
  async checkDates(
    classroomId: string,
    startDate: string,
    numDays: number,
    user: JwtPayload,
  ): Promise<{ occupied: string[]; nextFreeDate: string }> {
    if (!classroomId || !startDate) {
      return { occupied: [], nextFreeDate: startDate };
    }
    // Gera lista de datas do range
    const [y, m, d] = startDate.split('-').map(Number);
    const dates: string[] = [];
    for (let i = 0; i < numDays; i++) {
      const dt = new Date(y, m - 1, d + i);
      const yy = dt.getFullYear();
      const mm = String(dt.getMonth() + 1).padStart(2, '0');
      const dd = String(dt.getDate()).padStart(2, '0');
      dates.push(`${yy}-${mm}-${dd}`);
    }
    const rangeStart = new Date(y, m - 1, d, 0, 0, 0);
    const lastDate = dates[dates.length - 1].split('-').map(Number);
    const rangeEnd = new Date(lastDate[0], lastDate[1] - 1, lastDate[2], 23, 59, 59);
    // Busca planejamentos existentes que se sobrepõem ao range
    const existing = await this.prisma.planning.findMany({
      where: {
        classroomId,
        status: { notIn: [PlanningStatus.CANCELADO] },
        AND: [
          { startDate: { lte: rangeEnd } },
          { endDate: { gte: rangeStart } },
        ],
      },
      select: { startDate: true, endDate: true },
    });
    // Determina quais datas do range estão ocupadas
    const occupied: string[] = [];
    for (const dateStr of dates) {
      const [dy, dm, dd2] = dateStr.split('-').map(Number);
      const dt = new Date(dy, dm - 1, dd2);
      const isOccupied = existing.some(
        (p) => new Date(p.startDate) <= dt && new Date(p.endDate) >= dt,
      );
      if (isOccupied) occupied.push(dateStr);
    }
    // Encontra próxima data livre após o range
    let nextFreeDate = startDate;
    if (occupied.length > 0) {
      // Busca próxima data livre começando após o range
      const afterRange = new Date(lastDate[0], lastDate[1] - 1, lastDate[2] + 1);
      let candidate = afterRange;
      for (let i = 0; i < 365; i++) {
        const cy = candidate.getFullYear();
        const cm = String(candidate.getMonth() + 1).padStart(2, '0');
        const cd = String(candidate.getDate()).padStart(2, '0');
        const candidateStr = `${cy}-${cm}-${cd}`;
        const candidateEnd = new Date(cy, candidate.getMonth(), candidate.getDate(), 23, 59, 59);
        const isOccupied = existing.some(
          (p) => new Date(p.startDate) <= candidate && new Date(p.endDate) >= candidateEnd,
        );
        if (!isOccupied) {
          nextFreeDate = candidateStr;
          break;
        }
        candidate = new Date(cy, candidate.getMonth(), candidate.getDate() + 1);
      }
    }
    return { occupied, nextFreeDate };
  }
}
