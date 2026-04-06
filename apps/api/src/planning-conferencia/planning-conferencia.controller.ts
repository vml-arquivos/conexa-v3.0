import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  Param,
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
import { PlanningConferenciaService } from './planning-conferencia.service';
import { CreatePlanningConferenciaDto } from './dto/create-planning-conferencia.dto';
import { QueryPlanningConferenciaDto } from './dto/query-planning-conferencia.dto';

@Controller('planning-conferencia')
@UseGuards(JwtAuthGuard, RolesGuard)
export class PlanningConferenciaController {
  constructor(private readonly svc: PlanningConferenciaService) {}

  /**
   * POST /planning-conferencia
   * Cria ou actualiza a conferência de um dia para um planejamento.
   * Acesso: PROFESSOR | DEVELOPER
   */
  @Post()
  @HttpCode(HttpStatus.OK)
  @RequireRoles(RoleLevel.PROFESSOR, RoleLevel.DEVELOPER)
  upsert(
    @Body() dto: CreatePlanningConferenciaDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.svc.upsert(dto, user);
  }

  /**
   * GET /planning-conferencia
   * Lista conferências por planningId, classroomId e/ou período.
   * Acesso: todos os perfis com escopo válido
   */
  @Get()
  @RequireRoles(
    RoleLevel.PROFESSOR,
    RoleLevel.UNIDADE,
    RoleLevel.STAFF_CENTRAL,
    RoleLevel.MANTENEDORA,
    RoleLevel.DEVELOPER,
  )
  listar(
    @Query() query: QueryPlanningConferenciaDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.svc.listar(query, user);
  }

  /**
   * GET /planning-conferencia/resumo/:planningId
   * Resumo agregado FEITO/PARCIAL/NAO_REALIZADO para um planejamento.
   * Acesso: todos os perfis com escopo válido
   */
  @Get('resumo/:planningId')
  @RequireRoles(
    RoleLevel.PROFESSOR,
    RoleLevel.UNIDADE,
    RoleLevel.STAFF_CENTRAL,
    RoleLevel.MANTENEDORA,
    RoleLevel.DEVELOPER,
  )
  resumo(
    @Param('planningId') planningId: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.svc.resumoPorPlanning(planningId, user);
  }
}
