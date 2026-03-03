import { Injectable, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RoleLevel } from '@prisma/client';
import type { JwtPayload } from '../auth/interfaces/jwt-payload.interface';

export interface AccessibleUnit {
  id: string;
  code: string;
  name: string;
}

export interface AccessibleClassroom {
  id: string;
  code: string;
  name: string;
  unitId: string;
  ageGroupMin?: number | null;
  ageGroupMax?: number | null;
}

export interface AccessibleTeacher {
  id: string;
  name: string;
  email: string;
  unitId: string;
}

export interface AccessibleChild {
  id: string;
  firstName: string;
  lastName: string;
  name: string;
  classroomId?: string;
  allergies?: string | null;
  medicalConditions?: string | null;
}

@Injectable()
export class LookupService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Retorna unidades acessíveis baseado no role do usuário
   * 
   * Lógica de acesso:
   * 1. Roles globais/centrais (DEVELOPER, MANTENEDORA, STAFF_CENTRAL): retorna TODAS as units da mantenedora
   * 2. Se usuário tem unitScopes explícitos (sem role global): retorna apenas units dos scopes
   * 3. UNIDADE/PROFESSOR: retorna apenas a própria unit
   */
  async getAccessibleUnits(user: JwtPayload): Promise<AccessibleUnit[]> {
    // Log seguro para diagnóstico
    const roleLevels = user.roles.map((r) => r.level).join(', ');
    const allUnitScopes: string[] = [];
    for (const role of user.roles) {
      if (role.unitScopes && role.unitScopes.length > 0) {
        allUnitScopes.push(...role.unitScopes);
      }
    }
    console.log(
      `[LookupService.getAccessibleUnits] email=${user.email} role=${roleLevels} mantenedoraId=${user.mantenedoraId} unitScopes=${allUnitScopes.length}`,
    );

    // 1. Roles globais e centrais (DEVELOPER, MANTENEDORA, STAFF_CENTRAL):
    //    Retornar TODAS as unidades da mantenedora — independente de unitScopes.
    //    Isso garante que Coordenação Geral e Psicóloga vejam todas as unidades COCRIS.
    const hasGlobalRole = user.roles.some((role) =>
      ['DEVELOPER', 'MANTENEDORA', 'STAFF_CENTRAL'].includes(role.level),
    );

    if (hasGlobalRole) {
      const units = await this.prisma.unit.findMany({
        where: { mantenedoraId: user.mantenedoraId },
        select: {
          id: true,
          code: true,
          name: true,
        },
        orderBy: { name: 'asc' },
      });
      console.log(
        `[LookupService.getAccessibleUnits] role global/central → retornando ${units.length} unidades`,
      );
      return units;
    }

    // 2. Se tem unitScopes explícitos (ex: STAFF_CENTRAL com escopo restrito a unidades específicas),
    //    retornar apenas as unidades dos scopes.
    //    NOTA: Este bloco só é atingido se NÃO for role global (já tratado acima).
    if (allUnitScopes.length > 0) {
      const uniqueUnitIds = Array.from(new Set(allUnitScopes));
      const units = await this.prisma.unit.findMany({
        where: {
          id: { in: uniqueUnitIds },
          mantenedoraId: user.mantenedoraId,
        },
        select: {
          id: true,
          code: true,
          name: true,
        },
        orderBy: { name: 'asc' },
      });
      console.log(
        `[LookupService.getAccessibleUnits] unitScopes → retornando ${units.length} unidades`,
      );
      return units;
    }

    // 3. UNIDADE/PROFESSOR: apenas a própria unidade
    if (!user.unitId) {
      console.log(
        `[LookupService.getAccessibleUnits] sem unitId e sem role global → retornando []`,
      );
      return [];
    }

    const unit = await this.prisma.unit.findUnique({
      where: { id: user.unitId },
      select: {
        id: true,
        code: true,
        name: true,
      },
    });

    console.log(
      `[LookupService.getAccessibleUnits] UNIDADE/PROFESSOR → retornando ${unit ? 1 : 0} unidade`,
    );
    return unit ? [unit] : [];
  }

  /**
   * Retorna turmas acessíveis por unitId
   * 
   * Lógica de acesso:
   * 1. PROFESSOR: apenas turmas vinculadas via ClassroomTeacher
   * 2. STAFF_CENTRAL com unitScopes: permitir apenas units dos scopes
   * 3. UNIDADE_*: permitir apenas da unitId do usuário
   * 4. Roles globais: permitir qualquer unit da mantenedora
   */
  async getAccessibleClassrooms(
    user: JwtPayload,
    unitId?: string,
  ): Promise<AccessibleClassroom[]> {
    // 1. PROFESSOR: apenas turmas vinculadas e ativas
    const isProfessor = user.roles.some((role) => role.level === 'PROFESSOR');
    if (isProfessor) {
      const classrooms = await this.prisma.classroom.findMany({
        where: {
          isActive: true,
          teachers: {
            some: {
              teacherId: user.sub,
              isActive: true,
            },
          },
          ...(unitId && { unitId }),
        },
        select: {
          id: true,
          code: true,
          name: true,
          unitId: true,
          ageGroupMin: true,
          ageGroupMax: true,
        },
        orderBy: { name: 'asc' },
      });
      return classrooms;
    }

    // 2. Coletar unitScopes
    const allUnitScopes: string[] = [];
    for (const role of user.roles) {
      if (role.unitScopes && role.unitScopes.length > 0) {
        allUnitScopes.push(...role.unitScopes);
      }
    }

    // Se tem unitScopes e unitId foi fornecido, validar acesso
    if (allUnitScopes.length > 0) {
      if (unitId) {
        // Verificar se unitId está nos scopes
        if (!allUnitScopes.includes(unitId)) {
          throw new ForbiddenException(
            'Você não tem acesso a turmas desta unidade',
          );
        }

        // Retornar turmas da unit solicitada (apenas ativas)
        const classrooms = await this.prisma.classroom.findMany({
          where: { unitId, isActive: true },
          select: {
            id: true,
            code: true,
            name: true,
            unitId: true,
          },
          orderBy: { name: 'asc' },
        });
        return classrooms;
      }

      // Se unitId não foi fornecido, retornar turmas de todas as units dos scopes (com limite, apenas ativas)
      const uniqueUnitIds = Array.from(new Set(allUnitScopes));
      const classrooms = await this.prisma.classroom.findMany({
        where: {
          unitId: { in: uniqueUnitIds },
          isActive: true,
        },
        select: {
          id: true,
          code: true,
          name: true,
          unitId: true,
        },
        orderBy: { name: 'asc' },
        take: 100, // Limite de segurança
      });
      return classrooms;
    }

    // 3. UNIDADE_*: apenas da unitId do usuário
    const isUnidadeRole = user.roles.some((role) => role.level === 'UNIDADE');
    if (isUnidadeRole && user.unitId) {
      if (unitId && unitId !== user.unitId) {
        throw new ForbiddenException(
          'Você não tem acesso a turmas desta unidade',
        );
      }

      const classrooms = await this.prisma.classroom.findMany({
        where: { unitId: user.unitId, isActive: true },
        select: {
          id: true,
          code: true,
          name: true,
          unitId: true,
        },
        orderBy: { name: 'asc' },
      });
      return classrooms;
    }

    // 4. Roles globais (DEVELOPER, MANTENEDORA, STAFF_CENTRAL): qualquer unit da mantenedora
    const hasGlobalRole = user.roles.some((role) =>
      ['DEVELOPER', 'MANTENEDORA', 'STAFF_CENTRAL'].includes(role.level),
    );

    if (hasGlobalRole) {
      if (!unitId) {
        return []; // Requer unitId para evitar retornar todas as turmas
      }

      // Validar que a unit pertence à mantenedora do usuário
      const unit = await this.prisma.unit.findFirst({
        where: { id: unitId, mantenedoraId: user.mantenedoraId },
        select: { id: true },
      });
      if (!unit) {
        throw new ForbiddenException('Unidade não encontrada ou sem acesso');
      }

      const classrooms = await this.prisma.classroom.findMany({
        where: { unitId, isActive: true },
        select: {
          id: true,
          code: true,
          name: true,
          unitId: true,
          ageGroupMin: true,
          ageGroupMax: true,
        },
        orderBy: { name: 'asc' },
      });
      return classrooms;
    }

    // Nenhuma regra aplicada
    return [];
  }

  /**
   * Retorna professores acessíveis por unitId
   * - Filtra por role PROFESSOR
   */
  async getAccessibleTeachers(
    unitId: string | undefined,
  ): Promise<AccessibleTeacher[]> {
    if (!unitId) {
      return [];
    }

    const users = await this.prisma.user.findMany({
      where: {
        unitId,
        roles: {
          some: {
            scopeLevel: 'PROFESSOR',
          },
        },
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        unitId: true,
      },
      orderBy: { firstName: 'asc' },
    });

    return users.map((u) => ({
      id: u.id,
      name: `${u.firstName} ${u.lastName}`.trim() || u.email,
      email: u.email,
      unitId: u.unitId || '',
    }));
  }

  /**
   * Retorna crianças acessíveis por turma (classroomId)
   * - PROFESSOR: apenas crianças das suas turmas
   * - UNIDADE/STAFF_CENTRAL/MANTENEDORA/DEVELOPER: crianças da turma solicitada
   */
  async getAccessibleChildren(
    user: JwtPayload,
    classroomId?: string,
  ): Promise<AccessibleChild[]> {
    if (!classroomId) {
      return [];
    }

    // Verificar se a turma existe e pertence à mantenedora do usuário
    const classroom = await this.prisma.classroom.findFirst({
      where: {
        id: classroomId,
        unit: {
          mantenedoraId: user.mantenedoraId,
        },
      },
    });

    if (!classroom) {
      throw new ForbiddenException('Turma não encontrada ou sem acesso');
    }

    // PROFESSOR: verificar se tem acesso à turma
    const isProfessor = user.roles.some((role) => role.level === 'PROFESSOR');
    if (isProfessor) {
      const hasAccess = await this.prisma.classroomTeacher.findFirst({
        where: {
          classroomId,
          teacherId: user.sub,
          isActive: true,
        },
      });
      if (!hasAccess) {
        throw new ForbiddenException('Você não tem acesso a esta turma');
      }
    }

    // Buscar crianças matriculadas na turma (via Enrollment)
    const enrollments = await this.prisma.enrollment.findMany({
      where: {
        classroomId,
        status: 'ATIVA',
      },
      include: {
        child: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            allergies: true,         // para AlergiaAlert
            medicalConditions: true,  // para AlergiaAlert
          },
        },
      },
      orderBy: {
        child: {
          firstName: 'asc',
        },
      },
    });

    return enrollments.map((e) => ({
      id: e.child.id,
      firstName: e.child.firstName,
      lastName: e.child.lastName,
      name: `${e.child.firstName} ${e.child.lastName}`.trim(),
      classroomId,
      allergies: e.child.allergies ?? null,         // para AlergiaAlert
      medicalConditions: e.child.medicalConditions ?? null, // para AlergiaAlert
    }));
  }

  /**
   * Retorna crianças de uma turma específica (endpoint alternativo)
   */
  async getChildrenByClassroom(
    classroomId: string,
    user: JwtPayload,
  ): Promise<AccessibleChild[]> {
    return this.getAccessibleChildren(user, classroomId);
  }
}
