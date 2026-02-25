import {
  Injectable,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import type { JwtPayload } from '../auth/interfaces/jwt-payload.interface';
import { RoleLevel } from '@prisma/client';
import { canAccessUnit } from '../common/utils/can-access-unit';

@Injectable()
export class ReportsService {
  constructor(private readonly prisma: PrismaService) {}

  private async getStaffCentralUnitScopes(userId: string): Promise<string[]> {
    const scopes = await this.prisma.userRoleUnitScope.findMany({
      where: {
        userRole: {
          userId,
          isActive: true,
          role: {
            level: RoleLevel.STAFF_CENTRAL,
          },
        },
      },
      select: { unitId: true },
    });

    return scopes.map((scope) => scope.unitId);
  }

  private getFullName(person?: {
    firstName?: string | null;
    lastName?: string | null;
    name?: string | null;
  } | null): string {
    if (!person) return '—';

    if (person.name?.trim()) return person.name.trim();

    return `${person.firstName || ''} ${person.lastName || ''}`.trim() || '—';
  }

  /**
   * Relatório de diário por turma
   */
  async getDiaryByClassroom(
    classroomId: string,
    startDate: string,
    endDate: string,
    user: JwtPayload,
  ) {
    if (!classroomId || !startDate || !endDate) {
      throw new BadRequestException(
        'classroomId, startDate e endDate são obrigatórios',
      );
    }

    // Validar acesso à turma
    const classroom = await this.prisma.classroom.findUnique({
      where: { id: classroomId },
      include: {
        unit: {
          select: {
            id: true,
            mantenedoraId: true,
            name: true,
          },
        },
      },
    });

    if (!classroom) {
      throw new BadRequestException('Turma não encontrada');
    }

    // RBAC: Professor só pode ver da própria turma
    if (user.roles.some((role) => role.level === RoleLevel.PROFESSOR)) {
      const isTeacher = await this.prisma.classroomTeacher.findFirst({
        where: {
          classroomId,
          teacherId: user.sub,
          isActive: true,
        },
      });

      if (!isTeacher) {
        throw new ForbiddenException(
          'Você não tem permissão para acessar esta turma',
        );
      }
    }

    const hasAccessToUnit = await canAccessUnit(
      user,
      classroom.unit.id,
      async ({ userId }) => this.getStaffCentralUnitScopes(userId),
    );

    if (!hasAccessToUnit) {
      throw new ForbiddenException('Sem acesso à unidade informada');
    }

    // Buscar eventos
    const events = await this.prisma.diaryEvent.findMany({
      where: {
        classroomId,
        eventDate: {
          gte: new Date(startDate),
          lte: new Date(endDate),
        },
      },
      include: {
        child: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
        unit: {
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
          },
        },
        planning: {
          select: {
            id: true,
            startDate: true,
            endDate: true,
            status: true,
          },
        },
        curriculumEntry: {
          select: {
            id: true,
            date: true,
            campoDeExperiencia: true,
            objetivoBNCC: true,
          },
        },
      },
      orderBy: {
        eventDate: 'asc',
      },
    });

    const enrichedEvents = events.map((event) => ({
      ...event,
      unitName: event.unit.name,
      classroomName: event.classroom.name,
      childName: this.getFullName(event.child),
      teacherName: this.getFullName(event.createdByUser),
    }));

    return {
      classroomId,
      classroomName: classroom.name,
      unitId: classroom.unit.id,
      unitName: classroom.unit.name,
      startDate,
      endDate,
      totalEvents: enrichedEvents.length,
      events: enrichedEvents,
    };
  }

  /**
   * Relatório de diário por período
   */
  async getDiaryByPeriod(
    startDate: string,
    endDate: string,
    user: JwtPayload,
  ) {
    if (!startDate || !endDate) {
      throw new BadRequestException('startDate e endDate são obrigatórios');
    }

    // Filtrar por escopo do usuário
    const where: any = {
      eventDate: {
        gte: new Date(startDate),
        lte: new Date(endDate),
      },
    };

    // Developer: sem filtro adicional
    if (!user.roles.some((role) => role.level === RoleLevel.DEVELOPER)) {
      // Mantenedora: filtrar por mantenedoraId
      if (user.roles.some((role) => role.level === RoleLevel.MANTENEDORA)) {
        where.mantenedoraId = user.mantenedoraId;
      }
      // Staff Central: filtrar por unitScopes
      else if (
        user.roles.some((role) => role.level === RoleLevel.STAFF_CENTRAL)
      ) {
        const unitScopes = await this.getStaffCentralUnitScopes(user.sub);
        where.unitId = {
          in: unitScopes.length > 0 ? unitScopes : ['__sem_escopo__'],
        };
      }
      // Unidade: filtrar por unitId
      else if (user.roles.some((role) => role.level === RoleLevel.UNIDADE)) {
        where.unitId = user.unitId;
      }
    }

    const events = await this.prisma.diaryEvent.findMany({
      where,
      include: {
        classroom: {
          select: {
            id: true,
            name: true,
          },
        },
        unit: {
          select: {
            id: true,
            name: true,
          },
        },
        child: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
        createdByUser: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
        planning: {
          select: {
            id: true,
            status: true,
          },
        },
      },
      orderBy: {
        eventDate: 'asc',
      },
    });

    const enrichedEvents = events.map((event) => ({
      ...event,
      unitName: event.unit.name,
      classroomName: event.classroom.name,
      childName: this.getFullName(event.child),
      teacherName: this.getFullName(event.createdByUser),
    }));

    return {
      startDate,
      endDate,
      totalEvents: enrichedEvents.length,
      events: enrichedEvents,
    };
  }

  /**
   * Relatório de eventos sem planning
   */
  async getUnplannedDiaryEvents(user: JwtPayload) {
    // Filtrar por escopo do usuário
    const where: any = {
      OR: [
        { planningId: null },
        {
          planning: {
            is: null,
          },
        },
      ],
    };

    // Developer: sem filtro adicional
    if (!user.roles.some((role) => role.level === RoleLevel.DEVELOPER)) {
      // Mantenedora: filtrar por mantenedoraId
      if (user.roles.some((role) => role.level === RoleLevel.MANTENEDORA)) {
        where.mantenedoraId = user.mantenedoraId;
      }
      // Staff Central: filtrar por unitScopes
      else if (
        user.roles.some((role) => role.level === RoleLevel.STAFF_CENTRAL)
      ) {
        const unitScopes = await this.getStaffCentralUnitScopes(user.sub);
        where.unitId = {
          in: unitScopes.length > 0 ? unitScopes : ['__sem_escopo__'],
        };
      }
      // Unidade: filtrar por unitId
      else if (user.roles.some((role) => role.level === RoleLevel.UNIDADE)) {
        where.unitId = user.unitId;
      }
    }

    const events = await this.prisma.diaryEvent.findMany({
      where,
      include: {
        classroom: {
          select: {
            id: true,
            name: true,
          },
        },
        unit: {
          select: {
            id: true,
            name: true,
          },
        },
        child: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
        createdByUser: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
      },
      orderBy: {
        eventDate: 'desc',
      },
    });

    const enrichedEvents = events.map((event) => ({
      ...event,
      unitName: event.unit.name,
      classroomName: event.classroom.name,
      childName: this.getFullName(event.child),
      teacherName: this.getFullName(event.createdByUser),
    }));

    return {
      totalUnplanned: enrichedEvents.length,
      events: enrichedEvents,
    };
  }

  // ─────────────────────────────────────────────────────────────────────────
  // COBERTURA E PENDÊNCIAS
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Cobertura de DiaryEvents por turma na unidade.
   * Retorna por turma: total de crianças, crianças com registro, percentual.
   */
  async getUnitCoverage(
    unitIdParam: string | undefined,
    startDateParam: string | undefined,
    endDateParam: string | undefined,
    user: JwtPayload,
  ) {
    // Determinar unitId alvo
    const targetUnitId = unitIdParam || user.unitId;
    if (!targetUnitId) {
      throw new BadRequestException('unitId é obrigatório');
    }

    // RBAC: UNIDADE só pode ver a própria unidade
    if (user.roles.some((r) => r.level === RoleLevel.UNIDADE)) {
      if (user.unitId && user.unitId !== targetUnitId) {
        throw new ForbiddenException('Sem acesso à unidade informada');
      }
    }

    // Período (padrão: hoje)
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const endOfToday = new Date(today);
    endOfToday.setHours(23, 59, 59, 999);

    const start = startDateParam ? new Date(startDateParam) : today;
    const end = endDateParam ? new Date(endDateParam + 'T23:59:59') : endOfToday;

    // Buscar turmas ativas da unidade com matrículas ativas
    const classrooms = await this.prisma.classroom.findMany({
      where: { unitId: targetUnitId, isActive: true },
      include: {
        enrollments: {
          where: { status: 'ATIVA' },
          select: { childId: true },
        },
      },
      orderBy: { name: 'asc' },
    });

    // Para cada turma, contar crianças com pelo menos 1 DiaryEvent no período
    const result = await Promise.all(
      classrooms.map(async (cls) => {
        const childIds = cls.enrollments.map((e) => e.childId);
        if (childIds.length === 0) {
          return {
            classroomId: cls.id,
            classroomName: cls.name,
            totalCriancas: 0,
            criancasComRegistro: 0,
            percentual: 0,
          };
        }

        // Distinct childIds com evento no período (sem N+1: uma query por turma)
        const eventsRaw = await this.prisma.diaryEvent.findMany({
          where: {
            classroomId: cls.id,
            childId: { in: childIds },
            eventDate: { gte: start, lte: end },
          },
          select: { childId: true },
          distinct: ['childId'],
        });

        const criancasComRegistro = eventsRaw.length;
        const totalCriancas = childIds.length;
        const percentual =
          totalCriancas > 0
            ? Math.round((criancasComRegistro / totalCriancas) * 100)
            : 0;

        return {
          classroomId: cls.id,
          classroomName: cls.name,
          totalCriancas,
          criancasComRegistro,
          percentual,
        };
      }),
    );

    // Totais da unidade
    const totalCriancas = result.reduce((s, r) => s + r.totalCriancas, 0);
    const totalComRegistro = result.reduce((s, r) => s + r.criancasComRegistro, 0);
    const percentualGeral =
      totalCriancas > 0
        ? Math.round((totalComRegistro / totalCriancas) * 100)
        : 0;

    return {
      unitId: targetUnitId,
      startDate: start.toISOString().split('T')[0],
      endDate: end.toISOString().split('T')[0],
      totalCriancas,
      totalComRegistro,
      percentualGeral,
      turmas: result,
    };
  }

  /**
   * Crianças sem DiaryEvent há X dias na unidade.
   */
  async getUnitPendings(
    unitIdParam: string | undefined,
    daysWithout: number,
    user: JwtPayload,
  ) {
    const targetUnitId = unitIdParam || user.unitId;
    if (!targetUnitId) {
      throw new BadRequestException('unitId é obrigatório');
    }

    if (user.roles.some((r) => r.level === RoleLevel.UNIDADE)) {
      if (user.unitId && user.unitId !== targetUnitId) {
        throw new ForbiddenException('Sem acesso à unidade informada');
      }
    }

    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - daysWithout);
    cutoff.setHours(0, 0, 0, 0);

    // Buscar todas as crianças ativas da unidade via matrículas
    const enrollments = await this.prisma.enrollment.findMany({
      where: {
        status: 'ATIVA',
        classroom: { unitId: targetUnitId, isActive: true },
      },
      select: {
        childId: true,
        classroomId: true,
        child: { select: { id: true, firstName: true, lastName: true } },
        classroom: { select: { id: true, name: true } },
      },
    });

    // Crianças com evento recente (após cutoff)
    const comRegistroRecente = await this.prisma.diaryEvent.findMany({
      where: {
        unitId: targetUnitId,
        eventDate: { gte: cutoff },
        childId: { in: enrollments.map((e) => e.childId) },
      },
      select: { childId: true },
      distinct: ['childId'],
    });

    const comRegistroSet = new Set(comRegistroRecente.map((e) => e.childId));

    // Crianças SEM registro recente
    const pendentes = enrollments
      .filter((e) => !comRegistroSet.has(e.childId))
      // deduplicar por childId (criança pode estar em mais de uma turma)
      .filter(
        (e, idx, arr) => arr.findIndex((x) => x.childId === e.childId) === idx,
      )
      .map((e) => ({
        childId: e.childId,
        nome: `${e.child.firstName} ${e.child.lastName}`.trim(),
        classroomId: e.classroomId,
        classroomName: e.classroom.name,
      }));

    return {
      unitId: targetUnitId,
      daysWithout,
      cutoffDate: cutoff.toISOString().split('T')[0],
      totalPendentes: pendentes.length,
      pendentes,
    };
  }

  /**
   * Cobertura multiunidade para Coordenação Geral.
   * Reutiliza getUnitCoverage e getUnitPendings por unidade.
   */
  async getCentralCoverage(
    startDateParam: string | undefined,
    endDateParam: string | undefined,
    daysWithout: number,
    user: JwtPayload,
  ) {
    // Determinar unidades acessíveis
    let unitIds: string[] = [];

    if (user.roles.some((r) => r.level === RoleLevel.DEVELOPER)) {
      // Developer: todas as unidades da mantenedora
      const units = await this.prisma.unit.findMany({
        where: { mantenedoraId: user.mantenedoraId },
        select: { id: true, name: true },
        orderBy: { name: 'asc' },
      });
      unitIds = units.map((u) => u.id);
    } else if (user.roles.some((r) => r.level === RoleLevel.MANTENEDORA)) {
      const units = await this.prisma.unit.findMany({
        where: { mantenedoraId: user.mantenedoraId },
        select: { id: true, name: true },
        orderBy: { name: 'asc' },
      });
      unitIds = units.map((u) => u.id);
    } else if (user.roles.some((r) => r.level === RoleLevel.STAFF_CENTRAL)) {
      unitIds = await this.getStaffCentralUnitScopes(user.sub);
    }

    if (unitIds.length === 0) {
      return {
        startDate: startDateParam,
        endDate: endDateParam,
        daysWithout,
        totalUnidades: 0,
        unidades: [],
      };
    }

    // Buscar nomes das unidades
    const unitsInfo = await this.prisma.unit.findMany({
      where: { id: { in: unitIds } },
      select: { id: true, name: true },
      orderBy: { name: 'asc' },
    });

    // Para cada unidade, calcular cobertura e pendências em paralelo
    const unidadesData = await Promise.all(
      unitsInfo.map(async (unit) => {
        const [coverage, pendings] = await Promise.all([
          this.getUnitCoverage(unit.id, startDateParam, endDateParam, user),
          this.getUnitPendings(unit.id, daysWithout, user),
        ]);
        return {
          unitId: unit.id,
          unitName: unit.name,
          totalCriancas: coverage.totalCriancas,
          totalComRegistro: coverage.totalComRegistro,
          percentualCobertura: coverage.percentualGeral,
          totalPendentes: pendings.totalPendentes,
          turmas: coverage.turmas,
        };
      }),
    );

    // Totais globais
    const totalCriancas = unidadesData.reduce((s, u) => s + u.totalCriancas, 0);
    const totalComRegistro = unidadesData.reduce((s, u) => s + u.totalComRegistro, 0);
    const percentualGeral =
      totalCriancas > 0
        ? Math.round((totalComRegistro / totalCriancas) * 100)
        : 0;

    return {
      startDate: startDateParam || new Date().toISOString().split('T')[0],
      endDate: endDateParam || new Date().toISOString().split('T')[0],
      daysWithout,
      totalUnidades: unidadesData.length,
      totalCriancas,
      totalComRegistro,
      percentualGeral,
      unidades: unidadesData,
    };
  }
}
