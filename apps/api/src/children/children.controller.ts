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
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { RequireRoles } from '../common/decorators/roles.decorator';
import { RoleLevel } from '@prisma/client';
import { ChildrenService } from './children.service';
import { CreateChildDto } from './dto/create-child.dto';
import { UpdateChildDto } from './dto/update-child.dto';
import { FilterChildDto } from './dto/filter-child.dto';

@Controller('children')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ChildrenController {
  constructor(private readonly childrenService: ChildrenService) {}

  /**
   * Criar nova criança
   */
  @Post()
  @RequireRoles(RoleLevel.UNIDADE)
  async create(@Body() createChildDto: CreateChildDto, @Request() req) {
    return this.childrenService.create(createChildDto, req.user);
  }

  /**
   * Listar crianças com filtros
   */
  @Get()
  async findAll(@Query() filters: FilterChildDto, @Request() req) {
    return this.childrenService.findAll(filters, req.user);
  }

  /**
   * Buscar criança por ID
   */
  @Get(':id')
  async findOne(@Param('id') id: string, @Request() req) {
    return this.childrenService.findOne(id, req.user);
  }

  /**
   * Atualizar criança
   */
  @Put(':id')
  @RequireRoles(RoleLevel.UNIDADE)
  async update(
    @Param('id') id: string,
    @Body() updateChildDto: UpdateChildDto,
    @Request() req,
  ) {
    return this.childrenService.update(id, updateChildDto, req.user);
  }

  /**
   * Deletar criança (soft delete)
   */
  @Delete(':id')
  @RequireRoles(RoleLevel.UNIDADE)
  async remove(@Param('id') id: string, @Request() req) {
    return this.childrenService.remove(id, req.user);
  }

  /**
   * Upload de foto da criança
   */
  @Post(':id/photo')
  @RequireRoles(RoleLevel.UNIDADE)
  @UseInterceptors(FileInterceptor('photo'))
  async uploadPhoto(
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File,
    @Request() req,
  ) {
    return this.childrenService.uploadPhoto(id, file, req.user);
  }

  /**
   * Criar matrícula para criança
   */
  @Post(':id/enrollment')
  @RequireRoles(RoleLevel.UNIDADE)
  async createEnrollment(
    @Param('id') id: string,
    @Body() enrollmentData: any,
    @Request() req,
  ) {
    return this.childrenService.createEnrollment(id, enrollmentData, req.user);
  }

  /**
   * Listar matrículas da criança
   */
  @Get(':id/enrollments')
  async getEnrollments(@Param('id') id: string, @Request() req) {
    return this.childrenService.getEnrollments(id, req.user);
  }

  /**
   * Adicionar restrição alimentar
   */
  @Post(':id/dietary-restriction')
  @RequireRoles(RoleLevel.UNIDADE)
  async addDietaryRestriction(
    @Param('id') id: string,
    @Body() restrictionData: any,
    @Request() req,
  ) {
    return this.childrenService.addDietaryRestriction(id, restrictionData, req.user);
  }

  /**
   * Listar restrições alimentares da criança
   */
  @Get(':id/dietary-restrictions')
  async getDietaryRestrictions(@Param('id') id: string, @Request() req) {
    return this.childrenService.getDietaryRestrictions(id, req.user);
  }

  /**
   * Buscar histórico de saúde da criança
   */
  @Get(':id/health-history')
  async getHealthHistory(@Param('id') id: string, @Request() req) {
    return this.childrenService.getHealthHistory(id, req.user);
  }
}
