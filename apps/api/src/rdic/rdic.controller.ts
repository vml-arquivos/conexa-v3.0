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
 * Fluxo de aprovação RDIC:
 *
 *  POST   /rdic                     → Professor cria (RASCUNHO)
 *  PATCH  /rdic/:id                 → Professor edita rascunho / Coord. edita em revisão
 *  PATCH  /rdic/:id/enviar-revisao  → Professor envia para revisão (RASCUNHO → EM_REVISAO)
 *  PATCH  /rdic/:id/devolver        → Coord. Unidade devolve ao professor (EM_REVISAO → RASCUNHO)
 *  PATCH  /rdic/:id/finalizar       → Coord. Unidade aprova e finaliza (EM_REVISAO → FINALIZADO)
 *  PATCH  /rdic/:id/publicar        → Coord. Unidade publica (FINALIZADO → PUBLICADO)
 *  GET    /rdic                     → Lista com filtro por role automático
 *  GET    /rdic/:id                 → Detalhe (STAFF_CENTRAL só vê PUBLICADO)
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

  /** Atualizar rascunho (professor em RASCUNHO / coord. em EM_REVISAO) */
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

  /** Coord. Pedagógica da Unidade devolve ao professor para correção */
  @Patch(':id/devolver')
  @RequireRoles(RoleLevel.UNIDADE, RoleLevel.DEVELOPER)
  devolver(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.svc.devolver(id, user);
  }

  /** Coord. Pedagógica da Unidade finaliza/aprova o RDIC */
  @Patch(':id/finalizar')
  @RequireRoles(RoleLevel.UNIDADE, RoleLevel.DEVELOPER)
  finalizar(
    @Param('id') id: string,
    @Body() dto: any,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.svc.finalizar(id, dto, user);
  }

  /** Coord. Pedagógica da Unidade publica o RDIC (libera para coord. geral) */
  @Patch(':id/publicar')
  @RequireRoles(RoleLevel.UNIDADE, RoleLevel.DEVELOPER)
  publicar(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.svc.publicar(id, user);
  }
}
