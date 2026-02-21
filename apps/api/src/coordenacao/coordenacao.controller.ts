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
  @RequireRoles(RoleLevel.UNIDADE, RoleLevel.STAFF_CENTRAL, RoleLevel.MANTENEDORA, RoleLevel.DEVELOPER)
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
  @RequireRoles(RoleLevel.UNIDADE, RoleLevel.STAFF_CENTRAL, RoleLevel.MANTENEDORA, RoleLevel.DEVELOPER)
  atualizarStatus(@Param('id') id: string, @Body() dto: any, @CurrentUser() user: JwtPayload) {
    return this.svc.atualizarStatus(id, dto, user);
  }

  /**
   * POST /coordenacao/reunioes/:id/ata
   * Registrar ata de uma reunião
   */
  @Post('reunioes/:id/ata')
  @RequireRoles(RoleLevel.UNIDADE, RoleLevel.STAFF_CENTRAL, RoleLevel.MANTENEDORA, RoleLevel.DEVELOPER)
  registrarAta(@Param('id') id: string, @Body() dto: any, @CurrentUser() user: JwtPayload) {
    return this.svc.registrarAta(id, dto, user);
  }

  // ─── DASHBOARD DE COORDENAÇÃO ─────────────────────────────────────────────

  /**
   * GET /coordenacao/dashboard/unidade
   * Dashboard da coordenação pedagógica da unidade
   */
  @Get('dashboard/unidade')
  @RequireRoles(RoleLevel.UNIDADE, RoleLevel.STAFF_CENTRAL, RoleLevel.MANTENEDORA, RoleLevel.DEVELOPER)
  dashboardUnidade(@CurrentUser() user: JwtPayload) {
    return this.svc.getDashboardUnidade(user);
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
   */
  @Get('planejamentos')
  @RequireRoles(RoleLevel.UNIDADE, RoleLevel.STAFF_CENTRAL, RoleLevel.MANTENEDORA, RoleLevel.DEVELOPER)
  listarPlanejamentos(
    @Query('status') status: string,
    @Query('classroomId') classroomId: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.svc.listarPlanejamentos(status, classroomId, user);
  }

  /**
   * PATCH /coordenacao/planejamentos/:id/aprovar
   * Aprovar ou solicitar revisão de um planejamento
   */
  @Patch('planejamentos/:id/aprovar')
  @RequireRoles(RoleLevel.UNIDADE, RoleLevel.STAFF_CENTRAL, RoleLevel.DEVELOPER)
  aprovarPlanejamento(@Param('id') id: string, @Body() dto: any, @CurrentUser() user: JwtPayload) {
    return this.svc.aprovarPlanejamento(id, dto, user);
  }

  // ─── DIÁRIOS (visão coordenação) ──────────────────────────────────────────

  /**
   * GET /coordenacao/diarios
   * Listar diários de bordo de todas as turmas da unidade
   */
  @Get('diarios')
  @RequireRoles(RoleLevel.UNIDADE, RoleLevel.STAFF_CENTRAL, RoleLevel.MANTENEDORA, RoleLevel.DEVELOPER)
  listarDiarios(
    @Query('classroomId') classroomId: string,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.svc.listarDiarios(classroomId, startDate, endDate, user);
  }

  // ─── REQUISIÇÕES (visão coordenação) ──────────────────────────────────────

  /**
   * GET /coordenacao/requisicoes
   * Listar requisições de materiais pendentes da unidade
   */
  @Get('requisicoes')
  @RequireRoles(RoleLevel.UNIDADE, RoleLevel.STAFF_CENTRAL, RoleLevel.MANTENEDORA, RoleLevel.DEVELOPER)
  listarRequisicoes(@Query('status') status: string, @CurrentUser() user: JwtPayload) {
    return this.svc.listarRequisicoes(status, user);
  }
}
