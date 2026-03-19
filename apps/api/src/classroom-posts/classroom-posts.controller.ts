import {
  Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { RequireRoles } from '../common/decorators/roles.decorator';
import { RoleLevel } from '@prisma/client';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { JwtPayload } from '../auth/interfaces/jwt-payload.interface';
import { ClassroomPostsService } from './classroom-posts.service';

@Controller('classroom-posts')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ClassroomPostsController {
  constructor(private readonly svc: ClassroomPostsService) {}

  /**
   * POST /classroom-posts
   * Professor cria um post/tarefa na sala virtual
   */
  @Post()
  @RequireRoles(RoleLevel.PROFESSOR, RoleLevel.STAFF_CENTRAL, RoleLevel.DEVELOPER)
  criar(@Body() dto: any, @CurrentUser() user: JwtPayload) {
    return this.svc.criar(dto, user);
  }

  /**
   * GET /classroom-posts?classroomId=&type=
   * Listar posts de uma turma (professor vê suas turmas, coord vê todas da unidade)
   */
  @Get()
  @RequireRoles(
    RoleLevel.PROFESSOR,
    RoleLevel.UNIDADE,
    RoleLevel.STAFF_CENTRAL,
    RoleLevel.MANTENEDORA,
    RoleLevel.DEVELOPER,
  )
  listar(
    @Query('classroomId') classroomId: string,
    @Query('type') type: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.svc.listar(classroomId, type, user);
  }

  /**
   * GET /classroom-posts/:id
   * Detalhe de um post
   */
  @Get(':id')
  @RequireRoles(
    RoleLevel.PROFESSOR,
    RoleLevel.UNIDADE,
    RoleLevel.STAFF_CENTRAL,
    RoleLevel.MANTENEDORA,
    RoleLevel.DEVELOPER,
  )
  getById(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.svc.getById(id, user);
  }

  /**
   * PATCH /classroom-posts/:id
   * Atualizar post
   */
  @Patch(':id')
  @RequireRoles(RoleLevel.PROFESSOR, RoleLevel.UNIDADE, RoleLevel.DEVELOPER)
  atualizar(@Param('id') id: string, @Body() dto: any, @CurrentUser() user: JwtPayload) {
    return this.svc.atualizar(id, dto, user);
  }

  /**
   * POST /classroom-posts/:id/desempenho
   * Registrar/atualizar desempenho de um aluno em um post
   */
  @Post(':id/desempenho')
  @RequireRoles(RoleLevel.PROFESSOR, RoleLevel.UNIDADE, RoleLevel.DEVELOPER)
  registrarDesempenho(
    @Param('id') postId: string,
    @Body() dto: any,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.svc.registrarDesempenho(postId, dto, user);
  }

  /**
   * GET /classroom-posts/:id/desempenhos
   * Listar desempenhos de todos os alunos em um post
   */
  @Get(':id/desempenhos')
  @RequireRoles(
    RoleLevel.PROFESSOR,
    RoleLevel.UNIDADE,
    RoleLevel.STAFF_CENTRAL,
    RoleLevel.DEVELOPER,
  )
  listarDesempenhos(@Param('id') postId: string) {
    return this.svc.listarDesempenhos(postId);
  }

  /**
   * DELETE /classroom-posts/:id
   * Deletar post
   */
  @Delete(':id')
  @RequireRoles(RoleLevel.PROFESSOR, RoleLevel.UNIDADE, RoleLevel.DEVELOPER)
  deletar(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.svc.deletar(id, user);
  }
}
