import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { MaterialsService } from './materials.service';

@Controller('materials')
@UseGuards(JwtAuthGuard)
export class MaterialsController {
  constructor(private readonly service: MaterialsService) {}

  /**
   * GET /materials
   * Listar todos os materiais (com filtro opcional por categoria)
   */
  @Get()
  async findAll(@Query('category') category?: string) {
    return this.service.findAll(category);
  }

  /**
   * GET /materials/pedagogicos
   * Listar apenas materiais pedagógicos
   */
  @Get('pedagogicos')
  async findPedagogicos() {
    return this.service.findPedagogicos();
  }

  /**
   * GET /materials/higiene
   * Listar apenas materiais de higiene
   */
  @Get('higiene')
  async findHigiene() {
    return this.service.findHigiene();
  }

  /**
   * GET /materials/catalog?category=PEDAGOGICO|HIGIENE
   * Catálogo de preços de referência para pedidos de compra.
   * Retorna materiais do modelo Material com preço de referência.
   */
  @Get('catalog')
  async getCatalog(@Query('category') category?: string) {
    return this.service.getCatalog(category);
  }
}
