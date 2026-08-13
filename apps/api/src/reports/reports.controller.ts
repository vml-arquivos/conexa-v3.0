import { Controller, Get, Query, Request, UseGuards } from '@nestjs/common';
import { ReportsService } from './reports.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { RequireRoles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { JwtPayload } from '../auth/interfaces/jwt-payload.interface';

@Controller('reports')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  /**
   * GET /reports/diary/by-classroom
   * Relatório de diário por turma
   *
   * RBAC:
   * - DEVELOPER, MANTENEDORA, STAFF_CENTRAL: acesso total
   * - PROFESSOR: somente da própria turma
   */
  @Get('diary/by-classroom')
  getDiaryByClassroom(
    @Query('classroomId') classroomId: string,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.reportsService.getDiaryByClassroom(
      classroomId,
      startDate,
      endDate,
      user,
    );
  }

  /**
   * GET /reports/diary/by-period
   * Relatório de diário por período
   *
   * RBAC:
   * - DEVELOPER, MANTENEDORA, STAFF_CENTRAL: acesso
   * - PROFESSOR: negado
   */
  @Get('diary/by-period')
  @RequireRoles('DEVELOPER', 'MANTENEDORA', 'STAFF_CENTRAL')
  getDiaryByPeriod(
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
    @Query('unitId') unitId: string | undefined,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.reportsService.getDiaryByPeriod(startDate, endDate, user, unitId);
  }

  /**
   * GET /reports/diary/unplanned
   * Relatório de eventos sem planning
   *
   * RBAC:
   * - DEVELOPER, MANTENEDORA, STAFF_CENTRAL: acesso
   * - PROFESSOR: negado
   */
  @Get('diary/unplanned')
  @RequireRoles('DEVELOPER', 'MANTENEDORA', 'STAFF_CENTRAL')
  getUnplannedDiaryEvents(
    @Query('unitId') unitId: string | undefined,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.reportsService.getUnplannedDiaryEvents(user, unitId);
  }

  // ─────────────────────────────────────────────────────────────────────────
  // NOVOS ENDPOINTS — Cobertura e Pendências
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * GET /reports/unit/coverage
   * Cobertura de registros (DiaryEvents) por turma na unidade.
   *
   * Query params:
   *   unitId?    — opcional; se omitido usa unitId do token
   *   startDate  — ISO date (YYYY-MM-DD); padrão: hoje
   *   endDate    — ISO date (YYYY-MM-DD); padrão: hoje
   *
   * RBAC: UNIDADE, STAFF_CENTRAL, MANTENEDORA, DEVELOPER
   */
  @Get('unit/coverage')
  @RequireRoles('UNIDADE', 'STAFF_CENTRAL', 'MANTENEDORA', 'DEVELOPER')
  getUnitCoverage(
    @Query('unitId') unitId: string | undefined,
    @Query('startDate') startDate: string | undefined,
    @Query('endDate') endDate: string | undefined,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.reportsService.getUnitCoverage(unitId, startDate, endDate, user);
  }

  /**
   * GET /reports/unit/pendings
   * Crianças sem registro de DiaryEvent há X dias na unidade.
   *
   * Query params:
   *   unitId?      — opcional; se omitido usa unitId do token
   *   daysWithout  — número de dias sem registro (padrão: 1)
   *
   * RBAC: UNIDADE, STAFF_CENTRAL, MANTENEDORA, DEVELOPER
   */
  @Get('unit/pendings')
  @RequireRoles('UNIDADE', 'STAFF_CENTRAL', 'MANTENEDORA', 'DEVELOPER')
  getUnitPendings(
    @Query('unitId') unitId: string | undefined,
    @Query('daysWithout') daysWithout: string | undefined,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.reportsService.getUnitPendings(
      unitId,
      daysWithout ? parseInt(daysWithout, 10) : 1,
      user,
    );
  }

  /**
   * GET /reports/central/coverage
   * Cobertura multiunidade para Coordenação Geral / Staff Central.
   *
   * Query params:
   *   startDate  — ISO date (YYYY-MM-DD); padrão: hoje
   *   endDate    — ISO date (YYYY-MM-DD); padrão: hoje
   *   daysWithout — para calcular pendências (padrão: 1)
   *
   * RBAC: STAFF_CENTRAL, MANTENEDORA, DEVELOPER
   */
  @Get('central/coverage')
  @RequireRoles('STAFF_CENTRAL', 'MANTENEDORA', 'DEVELOPER')
  getCentralCoverage(
    @Query('startDate') startDate: string | undefined,
    @Query('endDate') endDate: string | undefined,
    @Query('daysWithout') daysWithout: string | undefined,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.reportsService.getCentralCoverage(
      startDate,
      endDate,
      daysWithout ? parseInt(daysWithout, 10) : 1,
      user,
    );
  }

  @Get('diary/summary')
  @UseGuards(JwtAuthGuard)
  getDiarySummary(
    @Query('unitId') unitId: string,
    @Query('classroomId') classroomId: string,
    @Query('mes') mes: string,
    @Request() req: any,
  ) {
    return this.reportsService.getDiarySummary(req.user, { unitId, classroomId, mes });
  }
}
