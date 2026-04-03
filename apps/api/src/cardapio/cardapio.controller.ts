import {
  Body, Controller, Delete, Get, Param, Patch, Post, Put, Query, UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { RequireRoles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { JwtPayload } from '../auth/interfaces/jwt-payload.interface';
import { RoleLevel } from '@prisma/client';
import { CardapioService } from './cardapio.service';
import { CreateCardapioDto } from './dto/create-cardapio.dto';
import { CardapioRefeicaoDto } from './dto/cardapio-refeicao.dto';
import { QueryCardapioDto } from './dto/query-cardapio.dto';

@Controller('cardapios')
@UseGuards(JwtAuthGuard, RolesGuard)
export class CardapioController {
  constructor(private readonly svc: CardapioService) {}

  /** GET /cardapios — listar cardápios da unidade */
  // PARTE 6: PROFESSOR pode listar cardápios publicados (compartilhamento controlado)
  @Get()
  @RequireRoles(RoleLevel.PROFESSOR, RoleLevel.UNIDADE, RoleLevel.STAFF_CENTRAL, RoleLevel.MANTENEDORA, RoleLevel.DEVELOPER)
  findAll(@Query() query: QueryCardapioDto, @CurrentUser() user: JwtPayload) {
    // Professores só vêem cardápios publicados
    const isProfessorOnly = user.roles?.every((r: any) => r.level === 'PROFESSOR');
    if (isProfessorOnly) query.publicado = 'true';
    return this.svc.findAll(query, user);
  }

  /** GET /cardapios/:id — buscar cardápio por ID */
  // PARTE 6: PROFESSOR pode ver cardápios publicados
  @Get(':id')
  @RequireRoles(RoleLevel.PROFESSOR, RoleLevel.UNIDADE, RoleLevel.STAFF_CENTRAL, RoleLevel.MANTENEDORA, RoleLevel.DEVELOPER)
  findOne(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.svc.findOne(id, user);
  }

  /** GET /cardapios/:id/nutricao — cálculo nutricional do cardápio */
  @Get(':id/nutricao')
  @RequireRoles(RoleLevel.UNIDADE, RoleLevel.STAFF_CENTRAL, RoleLevel.MANTENEDORA, RoleLevel.DEVELOPER)
  calcularNutricao(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.svc.calcularNutricao(id, user);
  }

  /** POST /cardapios — criar novo cardápio */
  @Post()
  @RequireRoles(RoleLevel.UNIDADE, RoleLevel.MANTENEDORA, RoleLevel.DEVELOPER)
  create(@Body() dto: CreateCardapioDto, @CurrentUser() user: JwtPayload) {
    return this.svc.create(dto, user);
  }

  /** PATCH /cardapios/:id — atualizar metadados do cardápio */
  @Patch(':id')
  @RequireRoles(RoleLevel.UNIDADE, RoleLevel.MANTENEDORA, RoleLevel.DEVELOPER)
  update(
    @Param('id') id: string,
    @Body() dto: Partial<CreateCardapioDto>,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.svc.update(id, dto, user);
  }

  /** PUT /cardapios/:id/refeicoes — upsert de uma refeição (dia + tipo) */
  @Put(':id/refeicoes')
  @RequireRoles(RoleLevel.UNIDADE, RoleLevel.MANTENEDORA, RoleLevel.DEVELOPER)
  upsertRefeicao(
    @Param('id') id: string,
    @Body() dto: CardapioRefeicaoDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.svc.upsertRefeicao(id, dto, user);
  }

  /** DELETE /cardapios/:id — excluir cardápio */
  @Delete(':id')
  @RequireRoles(RoleLevel.UNIDADE, RoleLevel.MANTENEDORA, RoleLevel.DEVELOPER)
  remove(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.svc.remove(id, user);
  }
}
