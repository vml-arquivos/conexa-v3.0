import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { RoleLevel } from '@prisma/client';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { RequireRoles } from '../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import type { JwtPayload } from '../auth/interfaces/jwt-payload.interface';
import { IntelligenceCoreService } from './intelligence-core.service';

@Controller('intelligence-core')
@UseGuards(JwtAuthGuard, RolesGuard)
export class IntelligenceCoreController {
  constructor(private readonly intelligenceCore: IntelligenceCoreService) {}

  /**
   * GET /intelligence-core/child/:childId/integral-profile
   *
   * Perfil integral da criança, somente leitura.
   * Cruza frequência, diário, observações, RDIC, nutrição, saúde, atendimento e alertas.
   * Não altera dados históricos e não gera diagnóstico clínico.
   */
  @Get('child/:childId/integral-profile')
  @RequireRoles(
    RoleLevel.PROFESSOR,
    RoleLevel.UNIDADE,
    RoleLevel.STAFF_CENTRAL,
    RoleLevel.MANTENEDORA,
    RoleLevel.DEVELOPER,
  )
  getIntegralChildProfile(
    @Param('childId') childId: string,
    @CurrentUser() user: JwtPayload,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.intelligenceCore.getIntegralChildProfile(childId, user, { startDate, endDate });
  }

  /**
   * GET /intelligence-core/child/:childId/rdic-draft-context
   *
   * Contexto estruturado para rascunho de RDIC/relatório individual.
   * Entrega evidências e seções sugeridas para revisão humana.
   */
  @Get('child/:childId/rdic-draft-context')
  @RequireRoles(
    RoleLevel.PROFESSOR,
    RoleLevel.UNIDADE,
    RoleLevel.STAFF_CENTRAL,
    RoleLevel.MANTENEDORA,
    RoleLevel.DEVELOPER,
  )
  getRdicDraftContext(
    @Param('childId') childId: string,
    @CurrentUser() user: JwtPayload,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.intelligenceCore.getRdicDraftContext(childId, user, { startDate, endDate });
  }

  /**
   * GET /intelligence-core/classroom/:classroomId/overview
   *
   * Visão agregada da turma para cockpit/professor/coordenação.
   */
  @Get('classroom/:classroomId/overview')
  @RequireRoles(
    RoleLevel.PROFESSOR,
    RoleLevel.UNIDADE,
    RoleLevel.STAFF_CENTRAL,
    RoleLevel.MANTENEDORA,
    RoleLevel.DEVELOPER,
  )
  getClassroomOverview(
    @Param('classroomId') classroomId: string,
    @CurrentUser() user: JwtPayload,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.intelligenceCore.getClassroomOverview(classroomId, user, { startDate, endDate });
  }
}
