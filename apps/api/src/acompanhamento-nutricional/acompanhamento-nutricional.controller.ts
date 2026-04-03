import {
  Controller, Get, Post, Put, Delete,
  Body, Param, Query, Request, UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { AcompanhamentoNutricionalService } from './acompanhamento-nutricional.service';

@Controller('acompanhamento-nutricional')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AcompanhamentoNutricionalController {
  constructor(private readonly service: AcompanhamentoNutricionalService) {}

  /**
   * Criar ou atualizar acompanhamento nutricional de uma criança (upsert por childId)
   * POST /acompanhamento-nutricional
   * RBAC: UNIDADE_NUTRICIONISTA, MANTENEDORA, DEVELOPER
   */
  @Post()
  async upsert(@Body() dto: any, @Request() req: any) {
    return this.service.upsert(dto, req.user);
  }

  /**
   * Buscar acompanhamento de uma criança específica
   * GET /acompanhamento-nutricional/crianca/:childId
   * RBAC: PROFESSOR (visão limitada), NUTRICIONISTA (completo), superiores
   */
  @Get('crianca/:childId')
  async findByChild(@Param('childId') childId: string, @Request() req: any) {
    return this.service.findByChild(childId, req.user);
  }

  /**
   * Listar todos os acompanhamentos ativos da unidade
   * GET /acompanhamento-nutricional?unitId=...&statusCaso=...
   * RBAC: UNIDADE_NUTRICIONISTA, MANTENEDORA, DEVELOPER
   */
  @Get()
  async listByUnit(
    @Query('unitId') unitId: string,
    @Query('statusCaso') statusCaso: string,
    @Request() req: any,
  ) {
    return this.service.listByUnit(unitId, req.user, statusCaso);
  }

  /**
   * Resumo consolidado da unidade (para coordenação/direção)
   * GET /acompanhamento-nutricional/resumo?unitId=...
   * RBAC: UNIDADE, MANTENEDORA, DEVELOPER
   */
  @Get('resumo')
  async resumoUnidade(@Query('unitId') unitId: string, @Request() req: any) {
    return this.service.resumoUnidade(unitId, req.user);
  }

  /**
   * Visão operacional por turma (para professor e cozinha)
   * GET /acompanhamento-nutricional/turma/:classroomId
   * RBAC: PROFESSOR, UNIDADE, MANTENEDORA, DEVELOPER
   */
  @Get('turma/:classroomId')
  async visaoOperacionalTurma(
    @Param('classroomId') classroomId: string,
    @Request() req: any,
  ) {
    return this.service.visaoOperacionalTurma(classroomId, req.user);
  }

  /**
   * Encerrar acompanhamento de uma criança
   * DELETE /acompanhamento-nutricional/crianca/:childId
   * RBAC: UNIDADE_NUTRICIONISTA, MANTENEDORA, DEVELOPER
   */
  @Delete('crianca/:childId')
  async encerrar(@Param('childId') childId: string, @Request() req: any) {
    return this.service.encerrar(childId, req.user);
  }
}
