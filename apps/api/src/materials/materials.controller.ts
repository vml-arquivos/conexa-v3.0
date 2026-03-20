import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { MaterialsService } from './materials.service';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { JwtPayload } from '../auth/interfaces/jwt-payload.interface';

@Controller('materials')
@UseGuards(JwtAuthGuard)
export class MaterialsController {
  constructor(private readonly service: MaterialsService) {}

  /**
   * GET /materials
   * Listar todos os materiais da unidade/mantenedora do usuário.
   * AUDITORIA MULTI-TENANT: filtra por escopo do token JWT.
   */
  @Get()
  async findAll(
    @CurrentUser() user: JwtPayload,
    @Query('category') category?: string,
  ) {
    return this.service.findAll(user, category);
  }

  /**
   * GET /materials/pedagogicos
   * Listar apenas materiais pedagógicos (escopo multi-tenant).
   */
  @Get('pedagogicos')
  async findPedagogicos(@CurrentUser() user: JwtPayload) {
    return this.service.findPedagogicos(user);
  }

  /**
   * GET /materials/higiene
   * Listar apenas materiais de higiene (escopo multi-tenant).
   */
  @Get('higiene')
  async findHigiene(@CurrentUser() user: JwtPayload) {
    return this.service.findHigiene(user);
  }

  /**
   * GET /materials/catalog?category=PEDAGOGICO|HIGIENE
   * Catálogo de preços de referência para pedidos de compra.
   * AUDITORIA MULTI-TENANT: filtra por mantenedoraId do token JWT.
   */
  @Get('catalog')
  async getCatalog(
    @CurrentUser() user: JwtPayload,
    @Query('category') category?: string,
  ) {
    return this.service.getCatalog(user, category);
  }

  /**
   * GET /materials/:id
   * Buscar material por ID com validação de escopo multi-tenant.
   * NOTA: Esta rota DEVE ficar após todas as rotas estáticas.
   */
  @Get(':id')
  async findOne(
    @Param('id') id: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.service.findOne(id, user);
  }
}
