import {
  Controller, Get, Post, Put, Delete,
  Param, Query, Body, UseGuards,
  BadRequestException, ForbiddenException, NotFoundException,
  HttpCode, HttpStatus,
} from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { RequireRoles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { LookupService } from '../lookup/lookup.service';
import { PrismaService } from '../prisma/prisma.service';
import { RoleLevel } from '@prisma/client';
import type { JwtPayload } from '../auth/interfaces/jwt-payload.interface';
import {
  podeAcessarUnidade,
  podeEditarOperacional,
} from '../auth/policies/politicas-acesso';

/** Mapeia ageGroupMin (meses) para o código de segmento pedagógico */
function inferAgeGroup(ageGroupMin: number): string {
  if (ageGroupMin <= 18) return 'EI01';
  if (ageGroupMin <= 47) return 'EI02';
  return 'EI03';
}

/** Mapeia código de segmento para ageGroupMin/ageGroupMax em meses */
function ageGroupToRange(ageGroup: string): { ageGroupMin: number; ageGroupMax: number } {
  switch (ageGroup) {
    case 'EI01': return { ageGroupMin: 0, ageGroupMax: 18 };
    case 'EI02': return { ageGroupMin: 19, ageGroupMax: 47 };
    case 'EI03': return { ageGroupMin: 48, ageGroupMax: 71 };
    default: throw new BadRequestException(`Segmento inválido: ${ageGroup}. Use EI01, EI02 ou EI03.`);
  }
}

@Controller('classrooms')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ClassroomsController {
  constructor(
    private readonly lookupService: LookupService,
    private readonly prisma: PrismaService,
  ) {}

  /**
   * GET /classrooms
   * Lista turmas acessíveis ao usuário com contagens de crianças e professores.
   * Suporta ?unitId= para filtrar por unidade.
   * RBAC: todos os roles autenticados (filtro aplicado por podeAcessarUnidade)
   */
  @Get()
  async findAll(
    @CurrentUser() user: JwtPayload,
    @Query('unitId') unitId?: string,
    @Query('limit') limit?: string,
  ) {
    // Construir where baseado no escopo do usuário
    const where: any = {};

    const isDeveloper = user.roles.some((r) => r.level === RoleLevel.DEVELOPER);
    const isMantenedora = user.roles.some((r) => r.level === RoleLevel.MANTENEDORA);
    const isStaffCentral = user.roles.some((r) => r.level === RoleLevel.STAFF_CENTRAL);
    const isUnidade = user.roles.some((r) => r.level === RoleLevel.UNIDADE);

    if (!isDeveloper) {
      if (isMantenedora) {
        where.unit = { mantenedoraId: user.mantenedoraId };
      } else if (isStaffCentral) {
        const staffRole = user.roles.find((r) => r.level === RoleLevel.STAFF_CENTRAL);
        const unitScopes = staffRole?.unitScopes ?? [];
        if (unitScopes.length > 0) {
          where.unitId = { in: unitScopes };
        } else {
          where.unit = { mantenedoraId: user.mantenedoraId };
        }
      } else if (isUnidade) {
        where.unitId = user.unitId;
      } else {
        // PROFESSOR: apenas turmas vinculadas
        const linked = await this.prisma.classroomTeacher.findMany({
          where: { teacherId: user.sub, isActive: true },
          select: { classroomId: true },
        });
        where.id = { in: linked.map((ct) => ct.classroomId) };
      }
    }

    // Filtro adicional por unitId (se fornecido e o usuário tem acesso)
    if (unitId) {
      if (!podeAcessarUnidade(user, unitId)) {
        throw new ForbiddenException('Sem acesso a esta unidade');
      }
      where.unitId = unitId;
    }

    const take = Math.min(parseInt(limit ?? '200', 10) || 200, 500);

    const classrooms = await this.prisma.classroom.findMany({
      where,
      include: {
        unit: { select: { id: true, name: true, code: true } },
        teachers: {
          where: { isActive: true },
          include: { teacher: { select: { id: true, firstName: true, lastName: true } } },
        },
        _count: { select: { enrollments: true, teachers: true } },
      },
      orderBy: [{ unitId: 'asc' }, { name: 'asc' }],
      take,
    });

    return classrooms.map((c) => ({
      id: c.id,
      name: c.name,
      code: c.code,
      ageGroup: inferAgeGroup(c.ageGroupMin),
      ageGroupMin: c.ageGroupMin,
      ageGroupMax: c.ageGroupMax,
      year: new Date().getFullYear(), // Classroom não tem campo year — usar ano corrente
      maxStudents: c.capacity,
      isActive: c.isActive,
      unit: c.unit,
      teachers: c.teachers.map((ct) => ({
        user: { firstName: ct.teacher.firstName, lastName: ct.teacher.lastName },
      })),
      _count: {
        children: c._count.enrollments,
        teachers: c._count.teachers,
      },
    }));
  }

  /**
   * POST /classrooms
   * Cria uma nova turma.
   * RBAC: DEVELOPER, MANTENEDORA, UNIDADE (apenas na própria unidade)
   * STAFF_CENTRAL: bloqueado (somente leitura conforme politicas-acesso.ts)
   */
  @Post()
  @RequireRoles(RoleLevel.DEVELOPER, RoleLevel.MANTENEDORA, RoleLevel.UNIDADE)
  @HttpCode(HttpStatus.CREATED)
  async create(
    @Body() body: {
      name: string;
      code?: string;
      ageGroup: string;
      year?: number;
      maxStudents?: number;
      unitId: string;
      isActive?: boolean;
    },
    @CurrentUser() user: JwtPayload,
  ) {
    if (!body.name?.trim()) throw new BadRequestException('Nome da turma é obrigatório');
    if (!body.unitId) throw new BadRequestException('unitId é obrigatório');
    if (!podeEditarOperacional(user, body.unitId)) {
      throw new ForbiddenException('Sem permissão para criar turmas nesta unidade');
    }
    const { ageGroupMin, ageGroupMax } = ageGroupToRange(body.ageGroup);
    const code = body.code?.trim().toUpperCase() ||
      body.name.trim().toUpperCase().replace(/\s+/g, '-').slice(0, 50);

    const classroom = await this.prisma.classroom.create({
      data: {
        unitId: body.unitId,
        name: body.name.trim(),
        code,
        ageGroupMin,
        ageGroupMax,
        capacity: body.maxStudents ?? 20,
        isActive: body.isActive ?? true,
        createdBy: user.sub,
      },
      include: {
        unit: { select: { id: true, name: true, code: true } },
      },
    });

    return {
      ...classroom,
      ageGroup: inferAgeGroup(classroom.ageGroupMin),
      maxStudents: classroom.capacity,
    };
  }

  /**
   * PUT /classrooms/:id
   * Atualiza uma turma existente.
   * RBAC: DEVELOPER, MANTENEDORA, UNIDADE (apenas na própria unidade)
   */
  @Put(':id')
  @RequireRoles(RoleLevel.DEVELOPER, RoleLevel.MANTENEDORA, RoleLevel.UNIDADE)
  async update(
    @Param('id') id: string,
    @Body() body: {
      name?: string;
      code?: string;
      ageGroup?: string;
      maxStudents?: number;
      unitId?: string;
      isActive?: boolean;
    },
    @CurrentUser() user: JwtPayload,
  ) {
    const existing = await this.prisma.classroom.findUnique({
      where: { id },
      select: { id: true, unitId: true },
    });
    if (!existing) throw new NotFoundException('Turma não encontrada');
    if (!podeEditarOperacional(user, existing.unitId)) {
      throw new ForbiddenException('Sem permissão para editar turmas desta unidade');
    }

    const data: any = { updatedBy: user.sub };
    if (body.name !== undefined) data.name = body.name.trim();
    if (body.code !== undefined) data.code = body.code.trim().toUpperCase();
    if (body.ageGroup !== undefined) {
      const range = ageGroupToRange(body.ageGroup);
      data.ageGroupMin = range.ageGroupMin;
      data.ageGroupMax = range.ageGroupMax;
    }
    if (body.maxStudents !== undefined) data.capacity = body.maxStudents;
    if (body.isActive !== undefined) data.isActive = body.isActive;

    const updated = await this.prisma.classroom.update({
      where: { id },
      data,
      include: {
        unit: { select: { id: true, name: true, code: true } },
      },
    });

    return {
      ...updated,
      ageGroup: inferAgeGroup(updated.ageGroupMin),
      maxStudents: updated.capacity,
    };
  }

  /**
   * DELETE /classrooms/:id
   * Remove uma turma (soft delete via isActive=false se tiver matrículas ativas,
   * hard delete apenas se não tiver matrículas).
   * RBAC: DEVELOPER, MANTENEDORA, UNIDADE (apenas na própria unidade)
   */
  @Delete(':id')
  @RequireRoles(RoleLevel.DEVELOPER, RoleLevel.MANTENEDORA, RoleLevel.UNIDADE)
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(
    @Param('id') id: string,
    @CurrentUser() user: JwtPayload,
  ) {
    const existing = await this.prisma.classroom.findUnique({
      where: { id },
      select: { id: true, unitId: true, _count: { select: { enrollments: true } } },
    });
    if (!existing) throw new NotFoundException('Turma não encontrada');
    if (!podeEditarOperacional(user, existing.unitId)) {
      throw new ForbiddenException('Sem permissão para excluir turmas desta unidade');
    }
    if (existing._count.enrollments > 0) {
      // Soft delete: desativar em vez de remover se há matrículas
      await this.prisma.classroom.update({
        where: { id },
        data: { isActive: false, updatedBy: user.sub },
      });
    } else {
      await this.prisma.classroom.delete({ where: { id } });
    }
  }

  /**
   * GET /classrooms/:id/children
   * Retorna crianças matriculadas em uma turma específica.
   * Compatibilidade com o TeacherDashboardPage.
   */
  @Get(':id/children')
  async getChildrenByClassroom(
    @Param('id') classroomId: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.lookupService.getChildrenByClassroom(classroomId, user);
  }
}
