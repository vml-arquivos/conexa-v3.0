import { Controller, Get, Post, Body, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { RequireRoles } from '../common/decorators/roles.decorator';
import { RoleLevel } from '@prisma/client';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { JwtPayload } from '../auth/interfaces/jwt-payload.interface';
import { TeachersService } from './teachers.service';

@Controller('teachers')
@UseGuards(JwtAuthGuard, RolesGuard)
export class TeachersController {
  constructor(private readonly service: TeachersService) {}

  /**
   * GET /teachers/dashboard
   * Dashboard do professor com turma, alunos e indicadores
   */
  @Get('dashboard')
  @RequireRoles(RoleLevel.PROFESSOR, RoleLevel.DEVELOPER)
  getDashboard(@CurrentUser() user: JwtPayload) {
    return this.service.getDashboard(user);
  }

  /**
   * GET /teachers/me/default-classroom
   * Retorna a turma padrão do professor para auto-preenchimento no Novo Planejamento.
   * Se houver apenas 1 turma ativa, retorna ela diretamente.
   * Se houver mais de 1, retorna a mais recente e a lista completa para dropdown.
   */
  @Get('me/default-classroom')
  @RequireRoles(RoleLevel.PROFESSOR, RoleLevel.DEVELOPER)
  getDefaultClassroom(@CurrentUser() user: JwtPayload) {
    return this.service.getDefaultClassroom(user);
  }

  /**
   * POST /teachers/planning/generate
   * Gera planejamento semanal automaticamente baseado na matriz curricular
   */
  @Post('planning/generate')
  @RequireRoles(RoleLevel.PROFESSOR, RoleLevel.DEVELOPER)
  generateWeeklyPlanning(
    @Body() dto: any,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.service.generateWeeklyPlanning(dto, user);
  }
}
