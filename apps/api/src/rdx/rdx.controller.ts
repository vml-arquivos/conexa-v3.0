import { BadRequestException, Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { RequireRoles } from '../common/decorators/roles.decorator';
import { RoleLevel } from '@prisma/client';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { JwtPayload } from '../auth/interfaces/jwt-payload.interface';
import { RdxService } from './rdx.service';

@Controller('rdx')
@UseGuards(JwtAuthGuard, RolesGuard)
export class RdxController {
  constructor(
    private readonly svc: RdxService,
    private readonly prisma: PrismaService,
  ) {}

  /**
   * POST /rdx
   * Criar novo relatório de fotos (RDX)
   */
  @Post()
  @RequireRoles(RoleLevel.PROFESSOR, RoleLevel.UNIDADE, RoleLevel.DEVELOPER)
  criar(@Body() dto: any, @CurrentUser() user: JwtPayload) {
    return this.svc.criar(dto, user);
  }

  /**
   * GET /rdx
   * Listar relatórios de fotos da turma/unidade
   */
  @Get()
  @RequireRoles(RoleLevel.PROFESSOR, RoleLevel.UNIDADE, RoleLevel.STAFF_CENTRAL, RoleLevel.MANTENEDORA, RoleLevel.DEVELOPER)
  listar(
    @Query('classroomId') classroomId: string,
    @Query('publicado') publicado: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.svc.listar(classroomId, publicado === 'true', user);
  }

  /**
   * GET /rdx/:id
   * Detalhe de um relatório de fotos
   */
  @Get(':id')
  @RequireRoles(RoleLevel.PROFESSOR, RoleLevel.UNIDADE, RoleLevel.STAFF_CENTRAL, RoleLevel.MANTENEDORA, RoleLevel.DEVELOPER)
  getById(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.svc.getById(id, user);
  }

  /**
   * PATCH /rdx/:id/publicar
   * Publicar relatório de fotos
   */
  @Patch(':id/publicar')
  @RequireRoles(RoleLevel.PROFESSOR, RoleLevel.UNIDADE, RoleLevel.DEVELOPER)
  publicar(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.svc.publicar(id, user);
  }

  /**
   * PATCH /rdx/:id/fotos
   * Adicionar fotos ao relatório (URLs de imagens)
   */
  @Patch(':id/fotos')
  @RequireRoles(RoleLevel.PROFESSOR, RoleLevel.UNIDADE, RoleLevel.DEVELOPER)
  adicionarFotos(@Param('id') id: string, @Body() dto: any, @CurrentUser() user: JwtPayload) {
    return this.svc.adicionarFotos(id, dto, user);
  }

  /**
   * POST /rdx/enviar-semanal
   * Marcar todas as fotos do mês como enviadas ao Regional de Ensino.
   * body.semana: string no formato "YYYY-MM" (ex: "2026-04")
   */
  @Post('enviar-semanal')
  @RequireRoles(RoleLevel.PROFESSOR, RoleLevel.UNIDADE, RoleLevel.DEVELOPER)
  async enviarSemanal(
    @Body() body: { classroomId: string; semana: string },
    @CurrentUser() user: JwtPayload,
  ) {
    if (!body.classroomId || !body.semana) {
      throw new BadRequestException('classroomId e semana são obrigatórios');
    }
    // Calcular início e fim do mês a partir de "YYYY-MM"
    const [ano, mes] = body.semana.split('-').map(Number);
    if (!ano || !mes || mes < 1 || mes > 12) {
      throw new BadRequestException('semana deve estar no formato YYYY-MM (ex: 2026-04)');
    }
    const inicio = new Date(ano, mes - 1, 1, 0, 0, 0);
    const fim    = new Date(ano, mes, 0, 23, 59, 59); // último dia do mês
    await this.prisma.relatorioFoto.updateMany({
      where: {
        classroomId: body.classroomId,
        weeklyReportSent: false,
        dataAtividade: {
          gte: inicio,
          lte: fim,
        },
      },
      data: {
        weeklyReportSent: true,
        weeklyReportSentAt: new Date(),
        weeklyReportRecipient: `Regional — enviado por ${user.sub}`,
      },
    });
    return { success: true, message: 'Fotos da semana marcadas como enviadas ao Regional.' };
  }
}
