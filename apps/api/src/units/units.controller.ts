import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';
import { UnitsService } from './units.service';
import type { CreateUnitDto, UpdateUnitDto } from './units.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';

/**
 * UnitsController — CRUD de Unidades
 *
 * Rotas:
 *   GET    /units                — lista unidades da mantenedora
 *   GET    /units/:id            — detalhe de uma unidade
 *   POST   /units                — criar nova unidade
 *   PATCH  /units/:id            — atualizar unidade (parcial)
 *   PUT    /units/:id            — atualizar unidade (compatibilidade frontend)
 *   DELETE /units/:id            — remover/desativar unidade
 *
 * RBAC:
 *   Leitura: DEVELOPER, MANTENEDORA, STAFF_CENTRAL, UNIDADE
 *   Escrita: DEVELOPER, MANTENEDORA, STAFF_CENTRAL
 */
@Controller('units')
@UseGuards(JwtAuthGuard)
export class UnitsController {
  constructor(private readonly unitsService: UnitsService) {}

  /**
   * GET /units
   * Lista unidades da mantenedora do usuário autenticado.
   * Query params:
   *   - include=counts  → inclui contagens de usuários/turmas/crianças
   *   - limit=N         → limitar quantidade (padrão 100)
   */
  @Get()
  async findAll(
    @Request() req: any,
    @Query('include') include?: string,
    @Query('limit') limit?: string,
  ) {
    return this.unitsService.findAll(req.user, {
      includeCounts: include === 'counts',
      limit: limit ? parseInt(limit, 10) : 100,
    });
  }

  /**
   * GET /units/:id
   * Retorna uma unidade específica com contagens.
   */
  @Get(':id')
  async findOne(@Request() req: any, @Param('id') id: string) {
    return this.unitsService.findOne(req.user, id);
  }

  /**
   * POST /units
   * Cria uma nova unidade.
   * RBAC: DEVELOPER, MANTENEDORA, STAFF_CENTRAL
   */
  @Post()
  async create(@Request() req: any, @Body() body: CreateUnitDto) {
    return this.unitsService.create(req.user, body);
  }

  /**
   * PATCH /units/:id
   * Atualiza parcialmente uma unidade.
   * RBAC: DEVELOPER, MANTENEDORA, STAFF_CENTRAL
   */
  @Patch(':id')
  async update(
    @Request() req: any,
    @Param('id') id: string,
    @Body() body: UpdateUnitDto,
  ) {
    return this.unitsService.update(req.user, id, body);
  }

  /**
   * PUT /units/:id
   * Atualiza uma unidade (compatibilidade com frontend que usa PUT).
   * RBAC: DEVELOPER, MANTENEDORA, STAFF_CENTRAL
   */
  @Put(':id')
  async updatePut(
    @Request() req: any,
    @Param('id') id: string,
    @Body() body: UpdateUnitDto,
  ) {
    return this.unitsService.update(req.user, id, body);
  }

  /**
   * DELETE /units/:id
   * Remove ou desativa uma unidade.
   * RBAC: DEVELOPER, MANTENEDORA, STAFF_CENTRAL
   */
  @Delete(':id')
  async remove(@Request() req: any, @Param('id') id: string) {
    return this.unitsService.remove(req.user, id);
  }
}
