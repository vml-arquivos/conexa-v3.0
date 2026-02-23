import { Injectable, ForbiddenException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import type { JwtPayload } from '../auth/interfaces/jwt-payload.interface';
import { RoleLevel } from '@prisma/client';

function hasLevel(user: JwtPayload, ...levels: RoleLevel[]): boolean {
  return Array.isArray(user.roles) && user.roles.some((r: any) => levels.includes(r?.level));
}

@Injectable()
export class ClassroomPostsService {
  constructor(private readonly prisma: PrismaService) {}

  /** Criar post/tarefa na sala virtual */
  async criar(dto: any, user: JwtPayload) {
    const { classroomId, type, title, content, planningId, dueDate, status } = dto;

    // Verificar que o professor pertence à turma (ou é coordenador/diretor)
    if (hasLevel(user, RoleLevel.PROFESSOR)) {
      const vinculo = await this.prisma.classroomTeacher.findFirst({
        where: { classroomId, teacherId: user.sub, isActive: true },
      });
      if (!vinculo) throw new ForbiddenException('Professor não vinculado a esta turma');
    }

    const classroom = await this.prisma.classroom.findUnique({
      where: { id: classroomId },
      include: { unit: true },
    });
    if (!classroom) throw new NotFoundException('Turma não encontrada');

    return this.prisma.classroomPost.create({
      data: {
        classroomId,
        mantenedoraId: classroom.unit.mantenedoraId,
        unitId: classroom.unitId,
        type: type ?? 'TAREFA',
        status: status ?? 'PUBLICADO',
        title,
        content,
        planningId: planningId ?? null,
        dueDate: dueDate ? new Date(dueDate) : null,
        createdBy: user.sub,
      },
      include: { files: true, performances: true },
    });
  }

  /** Listar posts de uma turma */
  async listar(classroomId: string, type: string, user: JwtPayload) {
    const where: any = {};

    if (classroomId) {
      where.classroomId = classroomId;
    } else if (hasLevel(user, RoleLevel.PROFESSOR)) {
      // Professor vê apenas suas turmas
      const turmas = await this.prisma.classroomTeacher.findMany({
        where: { teacherId: user.sub, isActive: true },
        select: { classroomId: true },
      });
      where.classroomId = { in: turmas.map(t => t.classroomId) };
    } else if (hasLevel(user, RoleLevel.UNIDADE)) {
      // Coordenadora vê todas as turmas da unidade
      const turmas = await this.prisma.classroom.findMany({
        where: { unit: { users: { some: { id: user.sub } } }, isActive: true },
        select: { id: true },
      });
      where.classroomId = { in: turmas.map(t => t.id) };
    }

    if (type) where.type = type;

    return this.prisma.classroomPost.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 100,
      include: {
        files: true,
        performances: {
          include: { child: { select: { id: true, firstName: true, lastName: true, photoUrl: true } } },
        },
        classroom: { select: { id: true, name: true } },
      },
    });
  }

  /** Detalhe de um post */
  async getById(id: string, user: JwtPayload) {
    const post = await this.prisma.classroomPost.findUnique({
      where: { id },
      include: {
        files: true,
        performances: {
          include: { child: { select: { id: true, firstName: true, lastName: true, photoUrl: true } } },
        },
        classroom: { select: { id: true, name: true, unitId: true } },
      },
    });
    if (!post) throw new NotFoundException('Post não encontrado');
    return post;
  }

  /** Atualizar post */
  async atualizar(id: string, dto: any, user: JwtPayload) {
    const post = await this.prisma.classroomPost.findUnique({ where: { id } });
    if (!post) throw new NotFoundException('Post não encontrado');

    if (hasLevel(user, RoleLevel.PROFESSOR) && post.createdBy !== user.sub) {
      throw new ForbiddenException('Sem permissão para editar este post');
    }

    return this.prisma.classroomPost.update({
      where: { id },
      data: {
        title: dto.title ?? post.title,
        content: dto.content ?? post.content,
        type: dto.type ?? post.type,
        status: dto.status ?? post.status,
        dueDate: dto.dueDate ? new Date(dto.dueDate) : post.dueDate,
      },
      include: { files: true, performances: true },
    });
  }

  /** Registrar/atualizar desempenho de um aluno em um post */
  async registrarDesempenho(postId: string, dto: any, user: JwtPayload) {
    const { childId, performance, notes } = dto;

    return this.prisma.studentPostPerformance.upsert({
      where: { postId_childId: { postId, childId } },
      create: { postId, childId, performance, notes, createdBy: user.sub },
      update: { performance, notes },
      include: { child: { select: { id: true, firstName: true, lastName: true } } },
    });
  }

  /** Listar desempenhos de todos os alunos em um post */
  async listarDesempenhos(postId: string) {
    return this.prisma.studentPostPerformance.findMany({
      where: { postId },
      include: {
        child: { select: { id: true, firstName: true, lastName: true, photoUrl: true } },
      },
      orderBy: { child: { firstName: 'asc' } },
    });
  }

  /** Deletar post */
  async deletar(id: string, user: JwtPayload) {
    const post = await this.prisma.classroomPost.findUnique({ where: { id } });
    if (!post) throw new NotFoundException('Post não encontrado');

    if (hasLevel(user, RoleLevel.PROFESSOR) && post.createdBy !== user.sub) {
      throw new ForbiddenException('Sem permissão para excluir este post');
    }

    await this.prisma.classroomPost.delete({ where: { id } });
    return { success: true };
  }
}
