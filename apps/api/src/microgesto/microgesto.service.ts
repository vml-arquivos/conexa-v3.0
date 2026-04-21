import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import type { JwtPayload } from '../auth/interfaces/jwt-payload.interface';
import { MicrogestoCategoria, MicrogestoNivel } from '@prisma/client';

export interface CreateMicrogestoDto {
  childIds: string[];
  classroomId: string;
  diaryEventId?: string;
  data: string;
  categoria: MicrogestoCategoria;
  microgestoId: string;
  nivel: MicrogestoNivel;
  descricao?: string;
  campoExperiencia?: string;
  horario?: string;
  tags?: string[];
}

@Injectable()
export class MicrogestoService {
  constructor(private readonly prisma: PrismaService) {}

  async registrar(dto: CreateMicrogestoDto, user: JwtPayload) {
    const classroom = await this.prisma.classroom.findUnique({
      where: { id: dto.classroomId },
      include: { unit: { select: { id: true, mantenedoraId: true } } },
    });
    if (!classroom) throw new Error('Turma não encontrada');

    const data = new Date(dto.data + 'T12:00:00');

    const registros = await Promise.all(
      dto.childIds.map(childId =>
        this.prisma.microgestoRegistro.create({
          data: {
            childId,
            classroomId: dto.classroomId,
            diaryEventId: dto.diaryEventId ?? null,
            professorId: user.sub,
            unitId: classroom.unitId,
            mantenedoraId: classroom.unit.mantenedoraId,
            data,
            categoria: dto.categoria,
            nivel: dto.nivel,
            descricao: dto.descricao ?? null,
            campoExperiencia: dto.campoExperiencia ?? null,
            horario: dto.horario ?? null,
            tags: [dto.microgestoId, ...(dto.tags ?? [])],
          },
        })
      )
    );

    // Atualizar stats de cada criança de forma assíncrona
    for (const childId of dto.childIds) {
      this.atualizarChildStats(childId, classroom.unitId, classroom.unit.mantenedoraId)
        .catch(() => { /* não bloquear fluxo principal */ });
    }

    return registros;
  }

  async listarPorCrianca(childId: string, user: JwtPayload) {
    return this.prisma.microgestoRegistro.findMany({
      where: {
        childId,
        mantenedoraId: (user as any).mantenedoraId ?? undefined,
      },
      orderBy: { data: 'desc' },
      take: 100,
    });
  }

  async atualizarChildStats(childId: string, unitId: string, mantenedoraId: string) {
    const [total, porNivel, porCategoria] = await Promise.all([
      this.prisma.microgestoRegistro.count({ where: { childId } }),
      this.prisma.microgestoRegistro.groupBy({
        by: ['nivel'],
        where: { childId },
        _count: { nivel: true },
      }),
      this.prisma.microgestoRegistro.groupBy({
        by: ['categoria'],
        where: { childId },
        _count: { categoria: true },
      }),
    ]);

    const nivelMap = Object.fromEntries(porNivel.map(n => [n.nivel, n._count.nivel]));
    const catMap   = Object.fromEntries(porCategoria.map(c => [c.categoria, c._count.categoria]));

    await this.prisma.childProfileStats.upsert({
      where: { childId },
      create: {
        childId,
        unitId,
        mantenedoraId,
        totalMicrogestos: total,
        microgestosNivel: nivelMap,
        microgestosCategoria: catMap,
      },
      update: {
        totalMicrogestos: total,
        microgestosNivel: nivelMap,
        microgestosCategoria: catMap,
      },
    });
  }
}
