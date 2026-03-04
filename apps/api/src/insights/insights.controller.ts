import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { RequireRoles } from '../common/decorators/roles.decorator';
import { RoleLevel } from '@prisma/client';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { JwtPayload } from '../auth/interfaces/jwt-payload.interface';
import { InsightsService } from './insights.service';

@Controller('insights')
@UseGuards(JwtAuthGuard, RolesGuard)
export class InsightsController {
  constructor(private readonly insightsService: InsightsService) {}

  /**
   * GET /insights/teacher/today
   * Resumo do dia para o professor autenticado.
   */
  @Get('teacher/today')
  @RequireRoles(RoleLevel.PROFESSOR, RoleLevel.UNIDADE, RoleLevel.DEVELOPER)
  getTeacherToday(@CurrentUser() user: JwtPayload) {
    return this.insightsService.getTeacherToday(user);
  }

  // ─────────────────────────────────────────────────────────────────────────
  // GOVERNANÇA PEDAGÓGICA
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * GET /insights/governance/funnel?unitId=&startDate=&endDate=
   *
   * Funil pedagógico: planejamentos por etapa do fluxo de revisão.
   * STAFF_CENTRAL/MANTENEDORA/DEVELOPER: unitId opcional (null = rede inteira)
   * UNIDADE: sempre usa token.unitId
   */
  @Get('governance/funnel')
  @RequireRoles(
    RoleLevel.UNIDADE,
    RoleLevel.STAFF_CENTRAL,
    RoleLevel.MANTENEDORA,
    RoleLevel.DEVELOPER,
  )
  getGovernanceFunnel(
    @CurrentUser() user: JwtPayload,
    @Query('unitId') unitId?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.insightsService.getGovernanceFunnel(user, { unitId, startDate, endDate });
  }

  /**
   * GET /insights/governance/coverage?unitId=&startDate=&endDate=
   *
   * Cobertura BNCC por campo de experiência (heatmap multiunidade).
   * STAFF_CENTRAL/MANTENEDORA/DEVELOPER: unitId opcional (null = rede inteira)
   * UNIDADE: sempre usa token.unitId
   */
  @Get('governance/coverage')
  @RequireRoles(
    RoleLevel.UNIDADE,
    RoleLevel.STAFF_CENTRAL,
    RoleLevel.MANTENEDORA,
    RoleLevel.DEVELOPER,
  )
  getGovernanceCoverage(
    @CurrentUser() user: JwtPayload,
    @Query('unitId') unitId?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.insightsService.getGovernanceCoverage(user, { unitId, startDate, endDate });
  }
}
