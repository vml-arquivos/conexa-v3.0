import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { RequireRoles } from '../common/decorators/roles.decorator';
import { RoleLevel } from '@prisma/client';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { JwtPayload } from '../auth/interfaces/jwt-payload.interface';
import { AttendanceService } from './attendance.service';

@Controller('attendance')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AttendanceController {
  constructor(private readonly svc: AttendanceService) {}

  /**
   * POST /attendance/register
   * Professor registra chamada da turma para uma data
   */
  @Post('register')
  @RequireRoles(RoleLevel.PROFESSOR, RoleLevel.UNIDADE, RoleLevel.DEVELOPER)
  register(@Body() dto: any, @CurrentUser() user: JwtPayload) {
    return this.svc.register(dto, user);
  }

  /**
   * GET /attendance/today
   * Busca chamada de hoje para a turma do professor
   */
  @Get('today')
  @RequireRoles(RoleLevel.PROFESSOR, RoleLevel.UNIDADE, RoleLevel.DEVELOPER)
  getToday(@Query('classroomId') classroomId: string, @CurrentUser() user: JwtPayload) {
    return this.svc.getToday(classroomId, user);
  }

  /**
   * GET /attendance/summary
   * Resumo de frequência por turma/período
   */
  @Get('summary')
  @RequireRoles(RoleLevel.PROFESSOR, RoleLevel.UNIDADE, RoleLevel.STAFF_CENTRAL, RoleLevel.DEVELOPER)
  getSummary(
    @Query('classroomId') classroomId: string,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.svc.getSummary(classroomId, startDate, endDate, user);
  }

  /**
   * GET /attendance/unit-summary
   * Resumo de frequência de todas as turmas da unidade (Coordenação)
   */
  @Get('unit-summary')
  @RequireRoles(RoleLevel.UNIDADE, RoleLevel.STAFF_CENTRAL, RoleLevel.MANTENEDORA, RoleLevel.DEVELOPER)
  getUnitSummary(@Query('date') date: string, @CurrentUser() user: JwtPayload) {
    return this.svc.getUnitSummary(date, user);
  }
}
