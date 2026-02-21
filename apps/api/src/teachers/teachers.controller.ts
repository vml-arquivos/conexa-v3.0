import { Controller, Get, UseGuards } from '@nestjs/common';
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
}
