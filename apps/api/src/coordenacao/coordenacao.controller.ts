import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { RequireRoles } from '../common/decorators/roles.decorator';
import { RoleLevel } from '@prisma/client';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { JwtPayload } from '../auth/interfaces/jwt-payload.interface';
import { CoordenacaoService } from './coordenacao.service';

@Controller('coordenacao')
@UseGuards(JwtAuthGuard, RolesGuard)
export class CoordenacaoController {
  constructor(private readonly svc: CoordenacaoService) {}

  // ─── REUNIÕES / PAUTAS ───────────────────────────────────────────────────

  /**
   * POST /coordenacao/reunioes
   * Criar nova reunião/pauta de coordenação
   */
  @Post('reunioes')
  @RequireRoles(RoleLevel.UNIDADE, RoleLevel.MANTENEDORA, RoleLevel.DEVELOPER)
  criarReuniao(@Body() dto: any, @CurrentUser() user: JwtPayload) {
    return this.svc.criarReuniao(dto, user);
  }

  /**
   * GET /coordenacao/reunioes
   * Listar reuniões da unidade ou rede
   */
  @Get('reunioes')
  @RequireRoles(RoleLevel.PROFESSOR, RoleLevel.UNIDADE, RoleLevel.STAFF_CENTRAL, RoleLevel.MANTENEDORA, RoleLevel.DEVELOPER)
  listarReunioes(@Query('tipo') tipo: string, @Query('status') status: string, @CurrentUser() user: JwtPayload) {
    return this.svc.listarReunioes(tipo, status, user);
  }

  /**
   * GET /coordenacao/reunioes/:id
   * Detalhe de uma reunião
   */
  @Get('reunioes/:id')
  @RequireRoles(RoleLevel.PROFESSOR, RoleLevel.UNIDADE, RoleLevel.STAFF_CENTRAL, RoleLevel.MANTENEDORA, RoleLevel.DEVELOPER)
  getReuniao(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.svc.getReuniao(id, user);
  }

  /**
   * PATCH /coordenacao/reunioes/:id/status
   * Atualizar status da reunião
   */
  @Patch('reunioes/:id/status')
  @RequireRoles(RoleLevel.UNIDADE, RoleLevel.MANTENEDORA, RoleLevel.DEVELOPER)
  atualizarStatus(@Param('id') id: string, @Body() dto: any, @CurrentUser() user: JwtPayload) {
    return this.svc.atualizarStatus(id, dto, user);
  }

  /**
   * PATCH /coordenacao/reunioes/:id/pauta
   * Salvar ou atualizar a pauta de uma reunião (antes de realizá-la)
   */
  @Patch('reunioes/:id/pauta')
  @RequireRoles(RoleLevel.UNIDADE, RoleLevel.MANTENEDORA, RoleLevel.DEVELOPER)
  atualizarPauta(@Param('id') id: string, @Body() dto: any, @CurrentUser() user: JwtPayload) {
    return this.svc.atualizarPauta(id, dto, user);
  }

  /**
   * POST /coordenacao/reunioes/:id/ata
   * Registrar ata de uma reunião
   */
  @Post('reunioes/:id/ata')
  @RequireRoles(RoleLevel.UNIDADE, RoleLevel.MANTENEDORA, RoleLevel.DEVELOPER)
  registrarAta(@Param('id') id: string, @Body() dto: any, @CurrentUser() user: JwtPayload) {
    return this.svc.registrarAta(id, dto, user);
  }

  // ─── DASHBOARD DE COORDENAÇÃO ─────────────────────────────────────────────

  /**
   * GET /coordenacao/dashboard/unidade
   * Dashboard da coordenação pedagógica da unidade
   * STAFF_CENTRAL pode passar ?unitId=<id> para ver qualquer unidade
   */
  @Get('dashboard/unidade')
  @RequireRoles(RoleLevel.UNIDADE, RoleLevel.STAFF_CENTRAL, RoleLevel.MANTENEDORA, RoleLevel.DEVELOPER)
  dashboardUnidade(@Query('unitId') unitId: string, @CurrentUser() user: JwtPayload) {
    return this.svc.getDashboardUnidade(user, unitId);
  }

  /**
   * GET /coordenacao/dashboard/geral
   * Dashboard consolidado da coordenação geral / mantenedora
   */
  @Get('dashboard/geral')
  @RequireRoles(RoleLevel.STAFF_CENTRAL, RoleLevel.MANTENEDORA, RoleLevel.DEVELOPER)
  dashboardGeral(@CurrentUser() user: JwtPayload) {
    return this.svc.getDashboardGeral(user);
  }

  // ─── PLANEJAMENTOS (visão coordenação) ────────────────────────────────────

  /**
   * GET /coordenacao/planejamentos
   * Listar planejamentos de todas as turmas da unidade
   * STAFF_CENTRAL pode passar ?unitId=<id> para ver qualquer unidade
   */
  @Get('planejamentos')
  @RequireRoles(RoleLevel.UNIDADE, RoleLevel.STAFF_CENTRAL, RoleLevel.MANTENEDORA, RoleLevel.DEVELOPER)
  listarPlanejamentos(
    @Query('status') status: string,
    @Query('classroomId') classroomId: string,
    @Query('unitId') unitId: string,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.svc.listarPlanejamentos(status, classroomId, user, unitId, startDate, endDate);
  }

  /**
   * PATCH /coordenacao/planejamentos/:id/aprovar
   * Aprovar ou solicitar revisão de um planejamento
   */
  @Patch('planejamentos/:id/aprovar')
  @RequireRoles(RoleLevel.UNIDADE, RoleLevel.DEVELOPER)
  aprovarPlanejamento(@Param('id') id: string, @Body() dto: any, @CurrentUser() user: JwtPayload) {
    return this.svc.aprovarPlanejamento(id, dto, user);
  }

  // ─── DIÁRIOS (visão coordenação) ──────────────────────────────────────────

  /**
   * GET /coordenacao/diarios
   * Listar diários de bordo de todas as turmas da unidade
   * STAFF_CENTRAL pode passar ?unitId=<id> para ver qualquer unidade
   */
  @Get('diarios')
  @RequireRoles(RoleLevel.UNIDADE, RoleLevel.STAFF_CENTRAL, RoleLevel.MANTENEDORA, RoleLevel.DEVELOPER)
  listarDiarios(
    @Query('classroomId') classroomId: string,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
    @Query('unitId') unitId: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.svc.listarDiarios(classroomId, startDate, endDate, user, unitId);
  }

  // ─── REQUISIÇÕES (visão coordenação) ──────────────────────────────────────

  /**
   * GET /coordenacao/requisicoes
   * Listar requisições de materiais pendentes da unidade
   * STAFF_CENTRAL pode passar ?unitId=<id> para ver qualquer unidade
   */
  @Get('requisicoes')
  @RequireRoles(RoleLevel.UNIDADE, RoleLevel.STAFF_CENTRAL, RoleLevel.MANTENEDORA, RoleLevel.DEVELOPER)
  listarRequisicoes(
    @Query('status') status: string,
    @Query('unitId') unitId: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.svc.listarRequisicoes(status, user, unitId);
  }

  // ─── UNIT CONTEXT SUMMARY ──────────────────────────────────────────────────────────

  /**
   * GET /coordenacao/unit-context/summary?unitId=<id>
   * Retorna resumo leve de uma unidade para preload do contexto central.
   * STAFF_CENTRAL/MANTENEDORA/DEVELOPER: unitId obrigatório via query param.
   * UNIDADE: usa token.unitId (ignora query param).
   */
  @Get('unit-context/summary')
  @RequireRoles(RoleLevel.UNIDADE, RoleLevel.STAFF_CENTRAL, RoleLevel.MANTENEDORA, RoleLevel.DEVELOPER)
  getUnitContextSummary(@Query('unitId') unitId: string, @CurrentUser() user: JwtPayload) {
    return this.svc.getUnitContextSummary(user, unitId);
  }

  // ─── TURMAS COM STATS COMPLETOS ────────────────────────────────────────────

  /**
   * GET /coordenacao/unit/classrooms
   * Turmas da unidade com childrenCount real, todos os professores ativos e plansCount.
   * STAFF_CENTRAL pode passar ?unitId=<id> para ver qualquer unidade
   */
  @Get('unit/classrooms')
  @RequireRoles(RoleLevel.UNIDADE, RoleLevel.STAFF_CENTRAL, RoleLevel.MANTENEDORA, RoleLevel.DEVELOPER)
  getUnitClassrooms(@Query('unitId') unitId: string, @CurrentUser() user: JwtPayload) {
    return this.svc.getUnitClassrooms(user, unitId);
  }
}
