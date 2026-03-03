import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { RequireRoles } from '../common/decorators/roles.decorator';
import { RoleLevel } from '@prisma/client';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { JwtPayload } from '../auth/interfaces/jwt-payload.interface';
import { RdicService } from './rdic.service';

/**
 * Fluxo de aprovação RDIC (P0):
 *
 *  POST   /rdic                        → Professor cria (RASCUNHO)
 *  PATCH  /rdic/:id                    → Professor edita RASCUNHO/DEVOLVIDO; Coord. edita EM_REVISAO
 *  PATCH  /rdic/:id/enviar-revisao     → Professor envia (→ EM_REVISAO)
 *  POST   /rdic/:id/aprovar            → Coord. Unidade aprova (→ APROVADO)
 *  POST   /rdic/:id/devolver           → Coord. Unidade devolve com comentário (→ DEVOLVIDO)
 *  PATCH  /rdic/:id/finalizar          → Coord. Unidade finaliza legado (→ FINALIZADO)
 *  PATCH  /rdic/:id/publicar           → Coord. Unidade publica (→ PUBLICADO)
 *  GET    /rdic                        → Lista com filtro por role automático
 *  GET    /rdic/turma/status           → Completude da turma por bimestre
 *  GET    /rdic/turma/consolidado      → Consolidado para relatório
 *  GET    /rdic/:id                    → Detalhe (STAFF_CENTRAL só vê APROVADO/PUBLICADO)
 */
@Controller('rdic')
@UseGuards(JwtAuthGuard, RolesGuard)
export class RdicController {
  constructor(private readonly svc: RdicService) {}

  /** Professor cria RDIC em RASCUNHO */
  @Post()
  @RequireRoles(RoleLevel.PROFESSOR, RoleLevel.UNIDADE, RoleLevel.DEVELOPER)
  criar(@Body() dto: any, @CurrentUser() user: JwtPayload) {
    return this.svc.criar(dto, user);
  }

  /** Status de completude da turma por bimestre/período (DEVE vir antes de :id) */
  @Get('turma/status')
  @RequireRoles(
    RoleLevel.PROFESSOR,
    RoleLevel.UNIDADE,
    RoleLevel.STAFF_CENTRAL,
    RoleLevel.MANTENEDORA,
    RoleLevel.DEVELOPER,
  )
  turmaStatus(@Query() query: any, @CurrentUser() user: JwtPayload) {
    return this.svc.turmaStatus(query, user);
  }

  /** Consolidado da turma para relatório print-friendly (DEVE vir antes de :id) */
  @Get('turma/consolidado')
  @RequireRoles(
    RoleLevel.UNIDADE,
    RoleLevel.STAFF_CENTRAL,
    RoleLevel.MANTENEDORA,
    RoleLevel.DEVELOPER,
  )
  turmaConsolidado(@Query() query: any, @CurrentUser() user: JwtPayload) {
    return this.svc.turmaConsolidado(query, user);
  }

  /** Listar RDICs — filtro automático por role */
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
   * GET /rdic/geral
   * Alias para o painel central (Coordenação Geral / Psicóloga).
   * Retorna RDICs APROVADO/PUBLICADO/FINALIZADO da mantenedora.
   * Aceita ?unitId=<id> para filtrar por unidade.
   * DEVE vir antes de :id para não ser capturado como param.
   */
  @Get('geral')
  @RequireRoles(
    RoleLevel.STAFF_CENTRAL,
    RoleLevel.MANTENEDORA,
    RoleLevel.DEVELOPER,
  )
  listarGeral(@Query() query: any, @CurrentUser() user: JwtPayload) {
    // Força filtro de status para APROVADO/PUBLICADO/FINALIZADO se não especificado
    const queryGeral = {
      ...query,
      status: query.status ?? undefined, // respeita filtro explícito
    };
    return this.svc.listar(queryGeral, user);
  }

  /** Detalhe de um RDIC */
  @Get(':id')
  @RequireRoles(
    RoleLevel.PROFESSOR,
    RoleLevel.UNIDADE,
    RoleLevel.STAFF_CENTRAL,
    RoleLevel.MANTENEDORA,
    RoleLevel.DEVELOPER,
  )
  getById(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.svc.getById(id, user);
  }

  /** Atualizar rascunho (professor em RASCUNHO/DEVOLVIDO; coord. em EM_REVISAO) */
  @Patch(':id')
  @RequireRoles(RoleLevel.PROFESSOR, RoleLevel.UNIDADE, RoleLevel.DEVELOPER)
  atualizar(
    @Param('id') id: string,
    @Body() dto: any,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.svc.atualizar(id, dto, user);
  }

  /** Professor envia para revisão da coordenação pedagógica */
  @Patch(':id/enviar-revisao')
  @RequireRoles(RoleLevel.PROFESSOR, RoleLevel.DEVELOPER)
  enviarParaRevisao(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.svc.enviarParaRevisao(id, user);
  }

  /** Coord. Unidade aprova o RDIC (→ APROVADO) */
  @Post(':id/aprovar')
  @RequireRoles(RoleLevel.UNIDADE)
  aprovar(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.svc.aprovar(id, user);
  }

  /** Coord. Unidade devolve ao professor com comentário obrigatório (→ DEVOLVIDO) */
  @Post(':id/devolver')
  @RequireRoles(RoleLevel.UNIDADE)
  devolver(
    @Param('id') id: string,
    @Body() dto: { comment: string },
    @CurrentUser() user: JwtPayload,
  ) {
    return this.svc.devolver(id, dto, user);
  }

  /** Coord. Unidade finaliza/aprova o RDIC (legado → FINALIZADO) */
  @Patch(':id/finalizar')
  @RequireRoles(RoleLevel.UNIDADE, RoleLevel.DEVELOPER)
  finalizar(
    @Param('id') id: string,
    @Body() dto: any,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.svc.finalizar(id, dto, user);
  }

  /** Coord. Unidade publica o RDIC (→ PUBLICADO, disponível para central) */
  @Patch(':id/publicar')
  @RequireRoles(RoleLevel.UNIDADE, RoleLevel.DEVELOPER)
  publicar(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.svc.publicar(id, user);
  }
}
