import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { RequireRoles } from '../common/decorators/roles.decorator';
import { RoleLevel } from '@prisma/client';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { JwtPayload } from '../auth/interfaces/jwt-payload.interface';
import { MaterialRequestService } from './material-request.service';
import { CreateMaterialRequestDto } from './dto/create-material-request.dto';
import { ReviewMaterialRequestDto } from './dto/review-material-request.dto';

@Controller('material-requests')
@UseGuards(JwtAuthGuard, RolesGuard)
export class MaterialRequestController {
  constructor(private readonly svc: MaterialRequestService) {}

  /**
   * Apenas PROFESSOR (e DEVELOPER para testes) cria requisição.
   * UNIDADE (coordenadora) NÃO cria — ela aprova.
   */
  @Post()
  @RequireRoles(RoleLevel.PROFESSOR, RoleLevel.DEVELOPER)
  create(@Body() dto: CreateMaterialRequestDto, @CurrentUser() user: JwtPayload) {
    return this.svc.create(dto, user);
  }

  /**
   * Apenas PROFESSOR (e DEVELOPER) lista suas próprias requisições.
   * UNIDADE NÃO tem "minhas" — usa GET / para ver todas da unidade.
   */
  @Get('minhas')
  @RequireRoles(RoleLevel.PROFESSOR, RoleLevel.DEVELOPER)
  listMine(@CurrentUser() user: JwtPayload) {
    return this.svc.listMine(user);
  }

  /**
   * Relatório de consumo de materiais por turma e período.
   * FIX P0.2a: Rota estática DEVE vir ANTES de @Get(':id') para evitar que
   * 'relatorio-consumo' seja interpretado como um parâmetro :id pelo NestJS.
   *
   * STAFF_CENTRAL/MANTENEDORA/DEVELOPER: pode passar unitId (ou omitir para rede inteira)
   * UNIDADE: sempre usa token.unitId
   */
  @Get('relatorio-consumo')
  @RequireRoles(RoleLevel.UNIDADE, RoleLevel.STAFF_CENTRAL, RoleLevel.MANTENEDORA, RoleLevel.DEVELOPER)
  relatorioConsumo(
    @CurrentUser() user: JwtPayload,
    @Query('classroomId') classroomId?: string,
    @Query('dataInicio') dataInicio?: string,
    @Query('dataFim') dataFim?: string,
    @Query('unitId') unitId?: string,
    @Query('teacherId') teacherId?: string,
    // FIX P0: novos filtros opcionais
    @Query('status') status?: string,
    @Query('type') type?: string,
  ) {
    return this.svc.relatorioConsumo(user, { classroomId, dataInicio, dataFim, unitId, teacherId, status, type });
  }

  /**
   * Coordenadora/Direção lista todas as requisições da unidade.
   * STAFF_CENTRAL/MANTENEDORA/DEVELOPER vê rede inteira.
   * Filtros opcionais: status, classroomId, type/categoria.
   */
  @Get()
  @RequireRoles(RoleLevel.UNIDADE, RoleLevel.STAFF_CENTRAL, RoleLevel.MANTENEDORA, RoleLevel.DEVELOPER)
  list(
    @CurrentUser() user: JwtPayload,
    @Query('status') status?: string,
    @Query('classroomId') classroomId?: string,
    @Query('type') type?: string,
    @Query('categoria') categoria?: string,
  ) {
    return this.svc.list(user, { status, classroomId, type: type ?? categoria });
  }

  /**
   * Busca uma requisição pelo ID com detalhes completos.
   * UNIDADE: apenas requisições da própria unidade.
   * NOTA: Esta rota DEVE ficar após todas as rotas estáticas (minhas, relatorio-consumo).
   */
  @Get(':id')
  @RequireRoles(RoleLevel.PROFESSOR, RoleLevel.UNIDADE, RoleLevel.STAFF_CENTRAL, RoleLevel.MANTENEDORA, RoleLevel.DEVELOPER)
  getById(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.svc.getById(id, user);
  }

  /** Coordenador aprova ou rejeita uma requisição */
  @Patch(':id/review')
  @RequireRoles(RoleLevel.UNIDADE, RoleLevel.STAFF_CENTRAL, RoleLevel.MANTENEDORA, RoleLevel.DEVELOPER)
  review(
    @Param('id') id: string,
    @Body() dto: ReviewMaterialRequestDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.svc.review(id, dto, user);
  }

  @Delete(':id')
  @RequireRoles(
    RoleLevel.PROFESSOR,
    RoleLevel.UNIDADE,
    RoleLevel.STAFF_CENTRAL,
    RoleLevel.MANTENEDORA,
    RoleLevel.DEVELOPER,
  )
  deletarRequisicao(
    @Param('id') id: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.svc.delete(id, user);
  }
}
