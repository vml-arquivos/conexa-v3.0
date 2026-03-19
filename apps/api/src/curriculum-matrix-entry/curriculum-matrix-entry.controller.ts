import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
  UseInterceptors,
  BadRequestException,
} from '@nestjs/common';
import { RoleLevel } from '@prisma/client';
import { CacheTTL } from '@nestjs/cache-manager';
import { MatrixCacheInterceptor } from '../cache/matrix-cache.interceptor';
import { CurriculumMatrixEntryService } from './curriculum-matrix-entry.service';
import { CreateCurriculumMatrixEntryDto } from './dto/create-curriculum-matrix-entry.dto';
import { UpdateCurriculumMatrixEntryDto } from './dto/update-curriculum-matrix-entry.dto';
import { QueryCurriculumMatrixEntryDto } from './dto/query-curriculum-matrix-entry.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { ScopeGuard } from '../common/guards/scope.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { RequireRoles } from '../common/decorators/roles.decorator';
import type { JwtPayload } from '../auth/interfaces/jwt-payload.interface';

@Controller('curriculum-matrix-entries')
@UseGuards(JwtAuthGuard, RolesGuard, ScopeGuard)
export class CurriculumMatrixEntryController {
  constructor(
    private readonly curriculumMatrixEntryService: CurriculumMatrixEntryService,
  ) {}

  @Post()
  @RequireRoles('DEVELOPER', 'MANTENEDORA', 'STAFF_CENTRAL')
  create(
    @Body() createDto: CreateCurriculumMatrixEntryDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.curriculumMatrixEntryService.create(createDto, user);
  }

  @Get()
  @CacheTTL(86400) // 24h para matriz curricular (read-heavy, muda raramente)
  @UseInterceptors(MatrixCacheInterceptor)
  findAll(@Query() query: QueryCurriculumMatrixEntryDto, @CurrentUser() user: JwtPayload) {
    return this.curriculumMatrixEntryService.findAll(query, user);
  }

  /**
   * GET /curriculum-matrix-entries/coordenacao/full
   * Retorna a Matriz completa com exemploAtividade para coordenação.
   * Acesso: UNIDADE, STAFF_CENTRAL, MANTENEDORA, DEVELOPER.
   * Parâmetros: segment (EI01/EI02/EI03), startDate (YYYY-MM-DD), endDate (YYYY-MM-DD)
   */
  @Get('coordenacao/full')
  @RequireRoles(RoleLevel.UNIDADE, RoleLevel.STAFF_CENTRAL, RoleLevel.MANTENEDORA, RoleLevel.DEVELOPER)
  getMatrizFullForCoord(
    @Query('segment') segment: string,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
    @Query('unitId') unitId: string,
    @CurrentUser() user: JwtPayload,
  ) {
    if (!startDate || !endDate) {
      throw new BadRequestException('startDate e endDate são obrigatórios (YYYY-MM-DD)');
    }
    return this.curriculumMatrixEntryService.getMatrizFullForCoord(segment, startDate, endDate, unitId, user);
  }

  /**
   * GET /curriculum-matrix-entries/by-classroom-day?classroomId=...&date=YYYY-MM-DD
   *
   * Retorna os objetivos da Matriz 2026 para uma turma e data específica.
   * Detecta o segmento via ageGroupMin do Classroom (sem fallback).
   * Disponível para todos os roles autenticados (professor, coordenação, etc.).
   * O campo exemploAtividade é retornado apenas para coordenação e acima.
   */
  @Get('by-classroom-day')
  byClassroomDay(
    @Query('classroomId') classroomId: string,
    @Query('date') date: string,
    @CurrentUser() user: JwtPayload,
  ) {
    if (!classroomId || !date) {
      throw new BadRequestException('Os parâmetros classroomId e date são obrigatórios');
    }
    // Validar formato YYYY-MM-DD
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      throw new BadRequestException('O parâmetro date deve estar no formato YYYY-MM-DD');
    }
    return this.curriculumMatrixEntryService.byClassroomDay(classroomId, date, user);
  }

  /**
   * GET /curriculum-matrix-entries/by-classroom-date?classroomId=...&date=YYYY-MM-DD&days=N
   * Retorna objetivos da Matriz para uma turma a partir de uma data, por N dias (padrão 1).
   * exemploAtividade retornado apenas para coordenação e acima.
   */
  @Get('by-classroom-date')
  byClassroomDate(
    @Query('classroomId') classroomId: string,
    @Query('date') date: string,
    @Query('days') daysStr: string,
    @CurrentUser() user: JwtPayload,
  ) {
    if (!classroomId || !date) {
      throw new BadRequestException('Os parâmetros classroomId e date são obrigatórios');
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      throw new BadRequestException('O parâmetro date deve estar no formato YYYY-MM-DD');
    }
    const days = Math.min(Math.max(parseInt(daysStr ?? '1', 10) || 1, 1), 31);
    return this.curriculumMatrixEntryService.byClassroomDateRange(classroomId, date, days, user);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.curriculumMatrixEntryService.findOne(id, user);
  }

  @Patch(':id')
  @RequireRoles('DEVELOPER', 'MANTENEDORA', 'STAFF_CENTRAL')
  update(
    @Param('id') id: string,
    @Body() updateDto: UpdateCurriculumMatrixEntryDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.curriculumMatrixEntryService.update(id, updateDto, user);
  }

  @Delete(':id')
  @RequireRoles('DEVELOPER', 'MANTENEDORA')
  remove(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.curriculumMatrixEntryService.remove(id, user);
  }
}
