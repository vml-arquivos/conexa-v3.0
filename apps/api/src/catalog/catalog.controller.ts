import {
  Controller,
  Get,
  Post,
  Query,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { RequireRoles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { JwtPayload } from '../auth/interfaces/jwt-payload.interface';
import { RoleLevel } from '@prisma/client';
import { CatalogService } from './catalog.service';

@Controller('catalog')
@UseGuards(JwtAuthGuard, RolesGuard)
export class CatalogController {
  constructor(private readonly svc: CatalogService) {}

  /**
   * GET /catalog/items
   * Lista itens do catálogo (StockItem) com metadados parseados.
   * UNIDADE: apenas sua unidade. CENTRAL: filtra por unitId ou vê tudo.
   * Params: unitId (opcional), category (opcional: PEDAGOGICO|HIGIENE|...)
   */
  @Get('items')
  @RequireRoles(
    RoleLevel.UNIDADE,
    RoleLevel.STAFF_CENTRAL,
    RoleLevel.MANTENEDORA,
    RoleLevel.DEVELOPER,
  )
  getItems(
    @CurrentUser() user: JwtPayload,
    @Query('unitId') unitId?: string,
    @Query('category') category?: string,
  ) {
    return this.svc.getItems(user, { unitId, category });
  }

  /**
   * POST /catalog/import
   * Importa CSV ou XLSX e faz upsert em StockItem por (unitId, code).
   * RBAC: MANTENEDORA, DEVELOPER, UNIDADE (importa para sua própria unidade).
   * Body: multipart/form-data com campo "file" + campo "unitId" (obrigatório para MANTENEDORA).
   */
  @Post('import')
  @RequireRoles(
    RoleLevel.UNIDADE,
    RoleLevel.MANTENEDORA,
    RoleLevel.DEVELOPER,
  )
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
    }),
  )
  importCatalog(
    @CurrentUser() user: JwtPayload,
    @UploadedFile() file: Express.Multer.File,
    @Query('unitId') unitId?: string,
  ) {
    return this.svc.importCatalog(user, file, unitId);
  }
}
