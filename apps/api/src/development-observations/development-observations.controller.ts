import {
  Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { RequireRoles } from '../common/decorators/roles.decorator';
import { RoleLevel } from '@prisma/client';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { JwtPayload } from '../auth/interfaces/jwt-payload.interface';
import { DevelopmentObservationsService } from './development-observations.service';

@Controller('development-observations')
@UseGuards(JwtAuthGuard, RolesGuard)
export class DevelopmentObservationsController {
  constructor(private readonly svc: DevelopmentObservationsService) {}

  /**
   * POST /development-observations
   * Professor cria observação individual de um aluno
   */
  @Post()
  @RequireRoles(RoleLevel.PROFESSOR, RoleLevel.UNIDADE, RoleLevel.DEVELOPER)
  criar(@Body() dto: any, @CurrentUser() user: JwtPayload) {
    return this.svc.criar(dto, user);
  }

  /**
   * GET /development-observations?childId=&classroomId=&category=&startDate=&endDate=
   * Listar observações com filtros
   */
  @Get()
  @RequireRoles(
    RoleLevel.PROFESSOR,
    RoleLevel.UNIDADE,
    RoleLevel.STAFF_CENTRAL,
    RoleLevel.MANTENEDORA,
    RoleLevel.DEVELOPER,
  )
  listar(@Query() query: any, @CurrentUser() user: JwtPayload) {
    return this.svc.listar(query, user);
  }

  /**
   * GET /development-observations/evolucao/:childId
   * Evolução detalhada por período para dashboard analítico da coordenação
   */
  @Get('evolucao/:childId')
  @RequireRoles(
    RoleLevel.PROFESSOR,
    RoleLevel.UNIDADE,
    RoleLevel.STAFF_CENTRAL,
    RoleLevel.MANTENEDORA,
    RoleLevel.DEVELOPER,
  )
  evolucaoAluno(
    @Param('childId') childId: string,
    @Query('meses') meses: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.svc.evolucaoAluno(childId, Number(meses) || 3);
  }

  /**
   * GET /development-observations/resumo/:childId
   * Resumo de desenvolvimento de um aluno (para coordenadora)
   */
  @Get('resumo/:childId')
  @RequireRoles(
    RoleLevel.UNIDADE,
    RoleLevel.STAFF_CENTRAL,
    RoleLevel.MANTENEDORA,
    RoleLevel.DEVELOPER,
  )
  resumoAluno(@Param('childId') childId: string) {
    return this.svc.resumoAluno(childId);
  }

  /**
   * GET /development-observations/resumo-turma/:classroomId
   * Resumo consolidado de desenvolvimento de toda a turma
   */
  @Get('resumo-turma/:classroomId')
  @RequireRoles(
    RoleLevel.UNIDADE,
    RoleLevel.STAFF_CENTRAL,
    RoleLevel.MANTENEDORA,
    RoleLevel.DEVELOPER,
  )
  resumoTurma(@Param('classroomId') classroomId: string) {
    return this.svc.resumoTurma(classroomId);
  }

  /**
   * GET /development-observations/:id
   * Detalhe de uma observação
   */
  @Get(':id')
  @RequireRoles(
    RoleLevel.PROFESSOR,
    RoleLevel.UNIDADE,
    RoleLevel.STAFF_CENTRAL,
    RoleLevel.MANTENEDORA,
    RoleLevel.DEVELOPER,
  )
  getById(@Param('id') id: string) {
    return this.svc.getById(id);
  }

  /**
   * PATCH /development-observations/:id
   * Atualizar observação
   */
  @Patch(':id')
  @RequireRoles(RoleLevel.PROFESSOR, RoleLevel.UNIDADE, RoleLevel.DEVELOPER)
  atualizar(@Param('id') id: string, @Body() dto: any, @CurrentUser() user: JwtPayload) {
    return this.svc.atualizar(id, dto, user);
  }

  /**
   * DELETE /development-observations/:id
   * Deletar observação
   */
  @Delete(':id')
  @RequireRoles(RoleLevel.PROFESSOR, RoleLevel.UNIDADE, RoleLevel.DEVELOPER)
  deletar(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.svc.deletar(id, user);
  }
}
