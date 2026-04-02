import {
  Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { RequireRoles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { JwtPayload } from '../auth/interfaces/jwt-payload.interface';
import { RoleLevel } from '@prisma/client';
import { ConfiguracaoRefeicaoService } from './configuracao-refeicao.service';
import { CreateConfiguracaoRefeicaoDto } from './dto/create-configuracao-refeicao.dto';

@Controller('configuracao-refeicao')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ConfiguracaoRefeicaoController {
  constructor(private readonly svc: ConfiguracaoRefeicaoService) {}

  /**
   * GET /configuracao-refeicao/unidade/:unitId
   * Lista as refeições ativas configuradas para a unidade
   */
  @Get('unidade/:unitId')
  @RequireRoles(
    RoleLevel.UNIDADE,
    RoleLevel.STAFF_CENTRAL,
    RoleLevel.MANTENEDORA,
    RoleLevel.DEVELOPER,
  )
  findByUnit(
    @Param('unitId') unitId: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.svc.findByUnit(unitId, user);
  }

  /**
   * GET /configuracao-refeicao/unidade/:unitId/todas
   * Lista todas as refeições (incluindo inativas) para gerenciamento
   */
  @Get('unidade/:unitId/todas')
  @RequireRoles(
    RoleLevel.UNIDADE,
    RoleLevel.STAFF_CENTRAL,
    RoleLevel.MANTENEDORA,
    RoleLevel.DEVELOPER,
  )
  findAllByUnit(
    @Param('unitId') unitId: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.svc.findAllByUnit(unitId, user);
  }

  /**
   * POST /configuracao-refeicao
   * Cria uma nova configuração de refeição para a unidade
   */
  @Post()
  @RequireRoles(RoleLevel.UNIDADE, RoleLevel.MANTENEDORA, RoleLevel.DEVELOPER)
  create(
    @Body() dto: CreateConfiguracaoRefeicaoDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.svc.create(dto, user);
  }

  /**
   * PATCH /configuracao-refeicao/:id
   * Atualiza uma configuração de refeição existente
   */
  @Patch(':id')
  @RequireRoles(RoleLevel.UNIDADE, RoleLevel.MANTENEDORA, RoleLevel.DEVELOPER)
  update(
    @Param('id') id: string,
    @Body() dto: Partial<CreateConfiguracaoRefeicaoDto>,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.svc.update(id, dto, user);
  }

  /**
   * DELETE /configuracao-refeicao/:id
   * Desativa (soft delete) uma configuração de refeição
   */
  @Delete(':id')
  @RequireRoles(RoleLevel.UNIDADE, RoleLevel.MANTENEDORA, RoleLevel.DEVELOPER)
  remove(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.svc.remove(id, user);
  }

  /**
   * DELETE /configuracao-refeicao/:id/permanente
   * Exclui permanentemente (apenas DEVELOPER/MANTENEDORA)
   */
  @Delete(':id/permanente')
  @RequireRoles(RoleLevel.MANTENEDORA, RoleLevel.DEVELOPER)
  hardDelete(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.svc.hardDelete(id, user);
  }
}
