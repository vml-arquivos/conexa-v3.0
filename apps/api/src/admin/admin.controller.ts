import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Put,
  UploadedFile,
  UseGuards,
  UseInterceptors,
  Request,
  Query,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import * as multer from 'multer';

import { AdminService } from './admin.service';
import type { CreateUserDto, UpdateUserDto } from './admin.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { RequireRoles } from '../common/decorators/roles.decorator';
import { RoleLevel } from '@prisma/client';

@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  /**
   * GET /admin/users
   * Lista usuários da plataforma com filtro por role.
   * RBAC:
   *   - DEVELOPER / MANTENEDORA: todos os usuários da mantenedora
   *   - UNIDADE: apenas usuários da própria unidade
   */
  @Get('users')
  @RequireRoles(RoleLevel.MANTENEDORA, RoleLevel.UNIDADE, RoleLevel.DEVELOPER)
  async listUsers(
    @Request() req: any,
    @Query('limit') limit?: string,
    @Query('unitId') unitId?: string,
  ) {
    return this.adminService.listUsers(req.user, {
      limit: limit ? parseInt(limit, 10) : 200,
      unitId,
    });
  }

  /**
   * POST /admin/users
   * Cria um novo usuário com role e vínculo de unidade.
   * RBAC: MANTENEDORA, DEVELOPER
   */
  @Post('users')
  @RequireRoles(RoleLevel.MANTENEDORA, RoleLevel.DEVELOPER)
  async createUser(
    @Request() req: any,
    @Body() body: CreateUserDto,
  ) {
    return this.adminService.createUser(req.user, body);
  }

  /**
   * PUT /admin/users/:id
   * Atualiza dados de um usuário existente.
   * RBAC: MANTENEDORA, DEVELOPER
   */
  @Put('users/:id')
  @RequireRoles(RoleLevel.MANTENEDORA, RoleLevel.UNIDADE, RoleLevel.DEVELOPER)
  async updateUser(
    @Request() req: any,
    @Param('id') userId: string,
    @Body() body: UpdateUserDto,
  ) {
    return this.adminService.updateUser(req.user, userId, body);
  }

  /**
   * GET /admin/units
   * Lista unidades acessíveis pelo usuário.
   * RBAC: MANTENEDORA, DEVELOPER (todas); UNIDADE (só a própria)
   */
  @Get('units')
  @RequireRoles(RoleLevel.MANTENEDORA, RoleLevel.UNIDADE, RoleLevel.DEVELOPER)
  async listUnits(@Request() req: any) {
    return this.adminService.listUnits(req.user);
  }

  /**
   * Importa estrutura CEPI 2026:
   * colunas: ALUNO, NASCIMENTO, TURMA, PROFESSORA
   *
   * Multi-tenant:
   * - Se JWT tiver unitId -> usa.
   * - Se JWT não tiver unitId -> exigir ?unitId=...
   */
  @Post('upload/structure')
  @RequireRoles(RoleLevel.MANTENEDORA, RoleLevel.UNIDADE, RoleLevel.DEVELOPER)
  @UseInterceptors(
    FileInterceptor('file', {
      storage: multer.memoryStorage(),
      limits: { fileSize: 10 * 1024 * 1024 },
    }),
  )
  async uploadStructure(
    @UploadedFile() file: Express.Multer.File,
    @Request() req: any,
    @Query('unitId') unitId?: string,
  ) {
    return this.adminService.importStructureCsv(file, req.user, unitId);
  }
}
