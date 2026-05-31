import {
  Controller, Post, Body, Param, UseGuards,
  UploadedFile, UseInterceptors, BadRequestException,
  Query,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { ScopeGuard } from '../common/guards/scope.guard';
import { RequireRoles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { JwtPayload } from '../auth/interfaces/jwt-payload.interface';
import { RoleLevel } from '@prisma/client';
import { CurriculumImportService } from './curriculum-import.service';
import { ImportCurriculumDto, ImportMatrixDto } from './dto/import-curriculum.dto';

@Controller('curriculum-matrices')
@UseGuards(JwtAuthGuard, RolesGuard, ScopeGuard)
export class CurriculumImportController {
  constructor(private readonly importService: CurriculumImportService) {}

  /**
   * Dry-run: Simula a importação sem gravar no banco
   *
   * POST /curriculum-matrices/import/dry-run
   *
   * RBAC: Apenas MANTENEDORA e STAFF_CENTRAL
   */
  @Post('import/dry-run')
  @RequireRoles(RoleLevel.MANTENEDORA, RoleLevel.STAFF_CENTRAL)
  async importDryRun(
    @Body() dto: ImportCurriculumDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.importService.importDryRun(dto, user);
  }

  /**
   * Apply: Importa a matriz curricular do PDF para o banco
   *
   * POST /curriculum-matrices/:id/import/pdf
   *
   * RBAC: Apenas MANTENEDORA e STAFF_CENTRAL
   */
  @Post(':id/import/pdf')
  @RequireRoles(RoleLevel.MANTENEDORA, RoleLevel.STAFF_CENTRAL)
  async importApply(
    @Param('id') matrixId: string,
    @Body() dto: ImportMatrixDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.importService.importApply(matrixId, dto, user);
  }

  /**
   * Tarefa 3.3 — Importação via CSV
   *
   * POST /curriculum-matrices/import/csv
   *
   * Multipart/form-data:
   *   - file: arquivo .csv
   *   - name: nome da matriz (string)
   *   - year: ano letivo (number)
   *   - segment: segmento (EI01 | EI02 | EI03)
   *   - version: versão (number, default 1)
   *   - mantenedoraId: ID da mantenedora
   *
   * RBAC: Apenas MANTENEDORA, STAFF_CENTRAL e DEVELOPER
   */
  @Post('import/csv')
  @RequireRoles(RoleLevel.MANTENEDORA, RoleLevel.STAFF_CENTRAL, RoleLevel.DEVELOPER)
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB
      fileFilter: (_req, file, cb) => {
        if (!file.originalname.match(/\.(csv|txt)$/i)) {
          return cb(new BadRequestException('Apenas arquivos .csv são aceitos'), false);
        }
        cb(null, true);
      },
    }),
  )
  async importCsv(
    @UploadedFile() file: Express.Multer.File,
    @Body('name') name: string,
    @Body('year') yearStr: string,
    @Body('segment') segment: string,
    @Body('version') versionStr: string,
    @Body('mantenedoraId') mantenedoraIdBody: string,
    @CurrentUser() user: JwtPayload,
  ) {
    if (!file) throw new BadRequestException('Arquivo CSV não enviado');
    if (!name?.trim()) throw new BadRequestException('Nome da matriz é obrigatório');
    if (!segment?.trim()) throw new BadRequestException('Segmento é obrigatório');

    const year = parseInt(yearStr, 10) || new Date().getFullYear();
    const version = parseInt(versionStr, 10) || 1;

    // Usa mantenedoraId do body (para DEVELOPER) ou do JWT
    const mantenedoraId = mantenedoraIdBody?.trim() || user.mantenedoraId;
    if (!mantenedoraId) throw new BadRequestException('mantenedoraId é obrigatório');

    return this.importService.importCsv(
      file.buffer,
      { mantenedoraId, name, year, segment, version },
      user,
    );
  }
}
