import { Injectable, ForbiddenException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import type { JwtPayload } from '../auth/interfaces/jwt-payload.interface';
import { RoleLevel } from '@prisma/client';

function hasLevel(user: JwtPayload, ...levels: RoleLevel[]): boolean {
  return Array.isArray(user.roles) && user.roles.some((r: any) => levels.includes(r?.level));
}

@Injectable()
export class RecadosService {
  constructor(private readonly prisma: PrismaService) {}

  /** Coordenadora cria um recado para professoras */
  async criar(dto: any, user: JwtPayload) {
    if (!hasLevel(user, RoleLevel.UNIDADE, RoleLevel.STAFF_CENTRAL, RoleLevel.MANTENEDORA, RoleLevel.DEVELOPER)) {
      throw new ForbiddenException('Apenas coordenadores podem criar recados');
    }

    const { unitId, classroomId, destinatario, professorId, titulo, mensagem, importante, expiresAt } = dto;

    return this.prisma.recadoTurma.create({
      data: {
        mantenedoraId: user.mantenedoraId,
        unitId,
        classroomId: classroomId ?? null,
        destinatario: destinatario ?? 'TODAS_PROFESSORAS',
        professorId: professorId ?? null,
        titulo,
        mensagem,
        importante: importante ?? false,
        criadoPorId: user.sub,
        expiresAt: expiresAt ? new Date(expiresAt) : null,
      },
    });
  }

  /** Listar recados (professor vê os seus, coordenadora vê todos da unidade) */
  async listar(user: JwtPayload) {
    const now = new Date();
    const where: any = {
      OR: [{ expiresAt: null }, { expiresAt: { gte: now } }],
    };

    if (hasLevel(user, RoleLevel.PROFESSOR)) {
      // Professor vê recados para todas as professoras da unidade OU para sua turma específica
      const turmas = await this.prisma.classroomTeacher.findMany({
        where: { teacherId: user.sub, isActive: true },
        select: { classroomId: true },
      });
      const classroomIds = turmas.map(t => t.classroomId);

      where.AND = [
        {
          OR: [
            { destinatario: 'TODAS_PROFESSORAS' },
            { destinatario: 'TURMA_ESPECIFICA', classroomId: { in: classroomIds } },
            { destinatario: 'PROFESSOR_ESPECIFICO', professorId: user.sub },
          ],
        },
      ];

      // Filtrar pela unidade do professor
      if (user.unitId) {
        where.unitId = user.unitId;
      }
    } else if (hasLevel(user, RoleLevel.UNIDADE)) {
      // Coordenadora vê todos da sua unidade
      if (user.unitId) where.unitId = user.unitId;
    } else if (hasLevel(user, RoleLevel.STAFF_CENTRAL, RoleLevel.MANTENEDORA, RoleLevel.DEVELOPER)) {
      // Coord. geral vê de todas as unidades da mantenedora
      where.mantenedoraId = user.mantenedoraId;
    }

    const recados = await this.prisma.recadoTurma.findMany({
      where,
      orderBy: [{ importante: 'desc' }, { criadoEm: 'desc' }],
      take: 50,
      include: {
        leituras: { where: { userId: user.sub }, select: { lidoEm: true } },
      },
    });

    return recados.map(r => ({
      ...r,
      lido: r.leituras.length > 0,
      lidoEm: r.leituras[0]?.lidoEm ?? null,
      leituras: undefined,
    }));
  }

  /** Marcar recado como lido */
  async marcarLido(recadoId: string, user: JwtPayload) {
    await this.prisma.recadoLeitura.upsert({
      where: { recadoId_userId: { recadoId, userId: user.sub } },
      create: { recadoId, userId: user.sub },
      update: { lidoEm: new Date() },
    });
    return { success: true };
  }

  /** Deletar recado */
  async deletar(id: string, user: JwtPayload) {
    const recado = await this.prisma.recadoTurma.findUnique({ where: { id } });
    if (!recado) throw new NotFoundException('Recado não encontrado');

    if (!hasLevel(user, RoleLevel.UNIDADE, RoleLevel.STAFF_CENTRAL, RoleLevel.MANTENEDORA, RoleLevel.DEVELOPER)) {
      throw new ForbiddenException('Sem permissão para excluir recados');
    }

    await this.prisma.recadoTurma.delete({ where: { id } });
    return { success: true };
  }

  /** Contar recados não lidos do professor */
  async contarNaoLidos(user: JwtPayload): Promise<number> {
    const todos = await this.listar(user);
    return todos.filter((r: any) => !r.lido).length;
  }
}
