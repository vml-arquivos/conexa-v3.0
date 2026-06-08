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
  UseGuards,
  Request,
  UploadedFile,
  UseInterceptors,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
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
  @RequireRoles(RoleLevel.UNIDADE, RoleLevel.PROFESSOR)
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: 5 * 1024 * 1024 },
      fileFilter: (_req, file, cb) => {
        const allowedMimes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
        const accepted = allowedMimes.includes(file.mimetype);
        cb(accepted ? null : new BadRequestException('Tipo de arquivo não permitido'), accepted);
      },
    }),
  )
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
   * Listar todas as restrições alimentares ativas da unidade (para nutricionista)
   * RBAC: apenas UNIDADE (inclui UNIDADE_NUTRICIONISTA, UNIDADE_DIRETOR, etc.)
   */
  @Get('dietary-restrictions/unidade')
  @RequireRoles(RoleLevel.UNIDADE)
  async getAllDietaryRestrictionsByUnit(
    @Request() req,
    @Query('unitId') unitId?: string,
  ) {
    return this.childrenService.getAllDietaryRestrictionsByUnit(req.user, unitId);
  }

  /**
   * Dashboard consolidado de saúde: alergias, dietas, condições médicas, medicamentos
   * GET /children/health/dashboard?unitId=...&classroomId=...
   * Retorna crianças + stats em 1 request / 1 query (sem N+1)
   */
  @Get('health/dashboard')
  async getHealthDashboard(
    @Request() req,
    @Query('unitId') unitId?: string,
    @Query('classroomId') classroomId?: string,
  ) {
    return this.childrenService.getHealthDashboard(req.user, unitId, classroomId);
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

  /**
   * Atualizar campos administrativos da Secretaria
   *
   * PATCH /children/:id/secretaria
   *
   * Endpoint exclusivo da Secretaria para salvar campos JSONB adicionados
   * na migration 20260603040000_child_secretaria_administrative_fields:
   *   - transporte_escolar
   *   - autorizados_retirada
   *   - documentos_matricula
   *   - ficha_administrativa
   *
   * Acesso: UNIDADE_ADMINISTRATIVO, UNIDADE_DIRETOR, STAFF_CENTRAL, MANTENEDORA, DEVELOPER
   * Não altera dados pedagógicos (planos, diário, RDIC, matrículas).
   */
  @Patch(':id/secretaria')
  async updateSecretariaFields(
    @Param('id') id: string,
    @Body() body: {
      transporte_escolar?: Record<string, unknown>;
      autorizados_retirada?: Record<string, unknown>[];
      documentos_matricula?: Record<string, unknown>;
      ficha_administrativa?: Record<string, unknown>;
      nacionalidade?: string;
      naturalidade?: string;
      uf_nascimento?: string;
      endereco?: string;
      cep?: string;
      dados_responsaveis?: Record<string, unknown>;
    },
    @Request() req,
  ) {
    // Validação: não permitir body vazio
    if (!body || Object.keys(body).length === 0) {
      throw new BadRequestException('Nenhum campo fornecido para atualização.');
    }

    // Campos permitidos neste endpoint (somente administrativos)
    const allowedFields = [
      'transporte_escolar',
      'autorizados_retirada',
      'documentos_matricula',
      'ficha_administrativa',
      'nacionalidade',
      'naturalidade',
      'uf_nascimento',
      'endereco',
      'cep',
      'dados_responsaveis',
    ];

    const updateData: Record<string, unknown> = {};
    for (const field of allowedFields) {
      if (body[field as keyof typeof body] !== undefined) {
        updateData[field] = body[field as keyof typeof body];
      }
    }

    return this.childrenService.updateSecretariaFields(id, updateData, req.user);
  }

  /**
   * Ficha completa da criança para a Secretaria
   *
   * GET /children/:id/ficha-completa
   *
   * Retorna todos os dados administrativos da criança em um único objeto:
   * dados pessoais, responsáveis, saúde, documentos, transporte, autorizados,
   * matrículas e histórico administrativo.
   *
   * Usado pela FichaAlunoSecretariaPage para exibição e geração de PDF.
   *
   * Acesso: UNIDADE_ADMINISTRATIVO, UNIDADE_DIRETOR, STAFF_CENTRAL, MANTENEDORA, DEVELOPER
   */
  @Get(':id/ficha-completa')
  async getFichaCompleta(@Param('id') id: string, @Request() req) {
    return this.childrenService.getFichaCompleta(id, req.user);
  }
}
