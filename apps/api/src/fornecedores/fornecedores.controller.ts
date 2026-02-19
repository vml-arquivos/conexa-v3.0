import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { RequireRoles } from '../common/decorators/roles.decorator';
import { RoleLevel } from '@prisma/client';
import { FornecedoresService } from './fornecedores.service';
import { CreateFornecedorDto } from './dto/create-fornecedor.dto';
import { UpdateFornecedorDto } from './dto/update-fornecedor.dto';

@Controller('fornecedores')
@UseGuards(JwtAuthGuard, RolesGuard)
export class FornecedoresController {
  constructor(private readonly fornecedoresService: FornecedoresService) {}

  /**
   * Criar novo fornecedor
   */
  @Post()
  @RequireRoles(RoleLevel.MANTENEDORA)
  async create(@Body() createFornecedorDto: CreateFornecedorDto, @Request() req) {
    return this.fornecedoresService.create(createFornecedorDto, req.user);
  }

  /**
   * Listar fornecedores
   */
  @Get()
  async findAll(@Query('search') search: string, @Request() req) {
    return this.fornecedoresService.findAll(search, req.user);
  }

  /**
   * Buscar fornecedor por ID
   */
  @Get(':id')
  async findOne(@Param('id') id: string, @Request() req) {
    return this.fornecedoresService.findOne(id, req.user);
  }

  /**
   * Atualizar fornecedor
   */
  @Put(':id')
  @RequireRoles(RoleLevel.MANTENEDORA)
  async update(
    @Param('id') id: string,
    @Body() updateFornecedorDto: UpdateFornecedorDto,
    @Request() req,
  ) {
    return this.fornecedoresService.update(id, updateFornecedorDto, req.user);
  }

  /**
   * Deletar fornecedor
   */
  @Delete(':id')
  @RequireRoles(RoleLevel.MANTENEDORA)
  async remove(@Param('id') id: string, @Request() req) {
    return this.fornecedoresService.remove(id, req.user);
  }

  /**
   * Listar pedidos de compra do fornecedor
   */
  @Get(':id/pedidos')
  async getPedidos(@Param('id') id: string, @Request() req) {
    return this.fornecedoresService.getPedidos(id, req.user);
  }
}
