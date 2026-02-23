import {
  Body, Controller, Delete, Get, Param, Patch, Post, UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { RequireRoles } from '../common/decorators/roles.decorator';
import { RoleLevel } from '@prisma/client';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { JwtPayload } from '../auth/interfaces/jwt-payload.interface';
import { RecadosService } from './recados.service';

@Controller('recados')
@UseGuards(JwtAuthGuard, RolesGuard)
export class RecadosController {
  constructor(private readonly svc: RecadosService) {}

  /**
   * POST /recados
   * Coordenadora cria recado para professoras
   */
  @Post()
  @RequireRoles(RoleLevel.UNIDADE, RoleLevel.STAFF_CENTRAL, RoleLevel.MANTENEDORA, RoleLevel.DEVELOPER)
  criar(@Body() dto: any, @CurrentUser() user: JwtPayload) {
    return this.svc.criar(dto, user);
  }

  /**
   * GET /recados
   * Listar recados (filtro automático por role)
   */
  @Get()
  @RequireRoles(
    RoleLevel.PROFESSOR,
    RoleLevel.UNIDADE,
    RoleLevel.STAFF_CENTRAL,
    RoleLevel.MANTENEDORA,
    RoleLevel.DEVELOPER,
  )
  listar(@CurrentUser() user: JwtPayload) {
    return this.svc.listar(user);
  }

  /**
   * PATCH /recados/:id/lido
   * Marcar recado como lido
   */
  @Patch(':id/lido')
  @RequireRoles(
    RoleLevel.PROFESSOR,
    RoleLevel.UNIDADE,
    RoleLevel.STAFF_CENTRAL,
    RoleLevel.MANTENEDORA,
    RoleLevel.DEVELOPER,
  )
  marcarLido(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.svc.marcarLido(id, user);
  }

  /**
   * GET /recados/nao-lidos/count
   * Contar recados não lidos
   */
  @Get('nao-lidos/count')
  @RequireRoles(
    RoleLevel.PROFESSOR,
    RoleLevel.UNIDADE,
    RoleLevel.STAFF_CENTRAL,
    RoleLevel.DEVELOPER,
  )
  contarNaoLidos(@CurrentUser() user: JwtPayload) {
    return this.svc.contarNaoLidos(user);
  }

  /**
   * DELETE /recados/:id
   * Deletar recado
   */
  @Delete(':id')
  @RequireRoles(RoleLevel.UNIDADE, RoleLevel.STAFF_CENTRAL, RoleLevel.MANTENEDORA, RoleLevel.DEVELOPER)
  deletar(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.svc.deletar(id, user);
  }
}
