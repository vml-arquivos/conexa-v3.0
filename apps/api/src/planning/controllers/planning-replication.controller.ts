import { Controller, Post, Get, Param, Body, UseGuards, Request } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { RequireRoles } from '../../common/decorators/roles.decorator';
import { RoleLevel } from '@prisma/client';
import { PlanningReplicationService, CopyPlanningOptions } from '../services/planning-replication.service';

class CopyToNextWeekDto {
  // Sem parâmetros necessários
}

class CopyToClassroomsDto {
  classroomIds: string[];
}

class CopyPlanningDto {
  targetWeekStart?: string; // ISO date string
  targetClassroomIds?: string[];
  copyStructureOnly?: boolean;
  adjustDates?: boolean;
  copyActivities?: boolean;
  copyObjectives?: boolean;
}

@Controller('planning/:id/replicate')
@UseGuards(JwtAuthGuard, RolesGuard)
export class PlanningReplicationController {
  constructor(private replicationService: PlanningReplicationService) {}

  /**
   * Copia planejamento para próxima semana
   * POST /planning/:id/replicate/next-week
   */
  @Post('next-week')
  @RequireRoles(RoleLevel.PROFESSOR)
  async copyToNextWeek(@Param('id') planningId: string, @Request() req) {
    return this.replicationService.copyToNextWeek(planningId, req.user.id);
  }

  /**
   * Copia planejamento para outras turmas
   * POST /planning/:id/replicate/classrooms
   */
  @Post('classrooms')
  @RequireRoles(RoleLevel.PROFESSOR, RoleLevel.STAFF_CENTRAL)
  async copyToClassrooms(
    @Param('id') planningId: string,
    @Body() dto: CopyToClassroomsDto,
    @Request() req,
  ) {
    return this.replicationService.copyToClassrooms(
      planningId,
      dto.classroomIds,
      req.user.id,
    );
  }

  /**
   * Duplica planejamento como rascunho
   * POST /planning/:id/replicate/draft
   */
  @Post('draft')
  @RequireRoles(RoleLevel.PROFESSOR)
  async duplicateAsDraft(@Param('id') planningId: string, @Request() req) {
    return this.replicationService.duplicateAsDraft(planningId, req.user.id);
  }

  /**
   * Lista histórico de cópias
   * GET /planning/:id/replicate/history
   */
  @Get('history')
  @RequireRoles(RoleLevel.PROFESSOR, RoleLevel.STAFF_CENTRAL)
  async getCopyHistory(@Param('id') planningId: string, @Request() req) {
    return this.replicationService.getCopyHistory(planningId, req.user.id);
  }
}
