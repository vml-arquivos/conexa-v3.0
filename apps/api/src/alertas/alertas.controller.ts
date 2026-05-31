/**
 * alertas.controller.ts
 * Tarefa 2.4 — Expõe os alertas operacionais gerados pelo cron job via REST.
 *
 * GET /alertas
 *   - unitId (opcional): filtra por unidade
 *   - classroomId (opcional): filtra por turma
 *   - unread (opcional, boolean): se true, retorna apenas não resolvidos
 *   - limit (opcional, default 50)
 *
 * Acesso: PROFESSOR, UNIDADE, STAFF_CENTRAL, MANTENEDORA, DEVELOPER
 * O professor só vê alertas da sua turma (via classroomId ou turma vinculada).
 */
import {
  Controller,
  Get,
  Patch,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { RequireRoles } from '../common/decorators/roles.decorator';
import { RoleLevel } from '@prisma/client';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { JwtPayload } from '../auth/interfaces/jwt-payload.interface';
import { PrismaService } from '../prisma/prisma.service';

@Controller('alertas')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AlertasController {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * GET /alertas
   * Retorna alertas operacionais ativos para a unidade/turma do usuário.
   */
  @Get()
  @RequireRoles(
    RoleLevel.PROFESSOR,
    RoleLevel.UNIDADE,
    RoleLevel.STAFF_CENTRAL,
    RoleLevel.MANTENEDORA,
    RoleLevel.DEVELOPER,
  )
  async listar(
    @CurrentUser() user: JwtPayload,
    @Query('unitId') unitId?: string,
    @Query('classroomId') classroomId?: string,
    @Query('unread') unread?: string,
    @Query('limit') limit?: string,
  ) {
    const take = Math.min(Number(limit ?? 50), 200);
    const apenasNaoResolvidos = unread !== 'false';

    // Determinar o mantenedoraId do usuário para escopo de segurança
    const mantenedoraId: string | undefined =
      (user as any).mantenedoraId ?? undefined;

    const where: Record<string, any> = {
      ...(apenasNaoResolvidos ? { resolvido: false } : {}),
      ...(mantenedoraId ? { mantenedoraId } : {}),
    };

    // Filtros opcionais
    if (unitId) where.unitId = unitId;
    if (classroomId) where.classroomId = classroomId;

    // Professor: restringir à turma vinculada se não informou classroomId
    if (
      user.roleLevel === RoleLevel.PROFESSOR &&
      !classroomId &&
      !unitId
    ) {
      // Buscar turma do professor
      const vinculo = await this.prisma.classroomTeacher.findFirst({
        where: { teacherId: user.userId, active: true },
        select: { classroomId: true },
      });
      if (vinculo) where.classroomId = vinculo.classroomId;
    }

    const alertas = await this.prisma.alertaOperacional.findMany({
      where,
      orderBy: [
        { severidade: 'desc' },
        { criadoEm: 'desc' },
      ],
      take,
      include: {
        // Incluir dados da criança para exibição no dashboard
        child: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    // Resumo para os cards do dashboard
    const total = alertas.length;
    const criticos = alertas.filter(
      (a) => a.severidade === 'ALTA' || a.severidade === 'CRITICA',
    ).length;
    const atencao = alertas.filter((a) => a.severidade === 'MEDIA').length;

    return {
      total,
      criticos,
      atencao,
      alertas,
    };
  }

  /**
   * PATCH /alertas/:id/resolver
   * Marca um alerta como resolvido.
   */
  @Patch(':id/resolver')
  @HttpCode(HttpStatus.OK)
  @RequireRoles(
    RoleLevel.UNIDADE,
    RoleLevel.STAFF_CENTRAL,
    RoleLevel.MANTENEDORA,
    RoleLevel.DEVELOPER,
  )
  async resolver(
    @Param('id') id: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.prisma.alertaOperacional.update({
      where: { id },
      data: {
        resolvido: true,
        resolvidoPorId: user.userId,
        resolvidoEm: new Date(),
      },
    });
  }
}
