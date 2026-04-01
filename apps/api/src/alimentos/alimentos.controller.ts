import {
  Controller,
  Get,
  Post,
  Param,
  Query,
  Body,
  UseGuards,
} from '@nestjs/common';
import { AlimentosService } from './alimentos.service';
import { QueryAlimentoDto } from './dto/query-alimento.dto';
import { CalcularNutricaoDto } from './dto/calcular-nutricao.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';

@Controller('alimentos')
@UseGuards(JwtAuthGuard)
export class AlimentosController {
  constructor(private readonly alimentosService: AlimentosService) {}

  /**
   * GET /alimentos
   * Lista alimentos com busca por nome e filtro por categoria.
   * Query params: busca, categoria, limit, skip, apenasAtivos
   */
  @Get()
  findAll(@Query() query: QueryAlimentoDto) {
    return this.alimentosService.findAll(query);
  }

  /**
   * GET /alimentos/categorias
   * Retorna as categorias disponíveis com contagem de alimentos.
   */
  @Get('categorias')
  getCategorias() {
    return this.alimentosService.getCategorias();
  }

  /**
   * POST /alimentos/calcular-nutricao
   * Calcula os valores nutricionais para uma lista de alimentos + quantidades.
   * Body: { itens: [{ alimentoId, quantidade, unidade? }] }
   */
  @Post('calcular-nutricao')
  calcularNutricao(@Body() dto: CalcularNutricaoDto) {
    return this.alimentosService.calcularNutricao(dto);
  }

  /**
   * GET /alimentos/:id
   * Retorna um alimento pelo ID com nutrição por 100g e por porção padrão.
   */
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.alimentosService.findOne(id);
  }
}
