import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import type { JwtPayload } from '../auth/interfaces/jwt-payload.interface';

@Injectable()
export class InsightsService {
  constructor(private prisma: PrismaService) {}

  /**
   * GET /insights/teacher/today
   * Retorna o resumo do dia para o professor autenticado:
   * - Planejamento ativo para hoje (se houver)
   * - Objetivos da Matriz para hoje (via planning.description V2)
   * - Contagem de presenças do dia
   * - Próximo evento de diário
   * - Alertas (planejamentos em rascunho antigos)
   */
  async getTeacherToday(user: JwtPayload) {
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0]; // YYYY-MM-DD
    const startOfDay = new Date(todayStr + 'T00:00:00-03:00');
    const endOfDay = new Date(todayStr + 'T23:59:59-03:00');

    // 1. Buscar planejamento ativo para hoje
    const planning = await this.prisma.planning.findFirst({
      where: {
        createdBy: user.sub,
        startDate: { lte: endOfDay },
        endDate: { gte: startOfDay },
        status: { in: ['APROVADO', 'EM_REVISAO', 'RASCUNHO'] },
      },
      orderBy: { startDate: 'desc' },
      select: {
        id: true,
        title: true,
        status: true,
        description: true,
        startDate: true,
        endDate: true,
        classroomId: true,
        classroom: {
          select: { id: true, name: true, ageGroupMin: true, ageGroupMax: true },
        },
      },
    });

    // 2. Extrair objetivos do dia de hoje do planning V2
    let objetivosHoje: any[] = [];
    if (planning?.description) {
      try {
        const v2 = JSON.parse(planning.description);
        if (v2?.version === 2 && Array.isArray(v2.days)) {
          const dayData = v2.days.find((d: any) => d.date === todayStr);
          if (dayData?.objectives) {
            objetivosHoje = dayData.objectives;
          }
        }
      } catch {
        // description não é JSON V2, ignorar
      }
    }

    // 3. Contagem de presenças hoje via ClassroomTeacher
    const classroomTeachers = await this.prisma.classroomTeacher.findMany({
      where: { teacherId: user.sub },
      select: { classroomId: true, classroom: { select: { name: true } } },
    });
    const classroomIds = classroomTeachers.map(ct => ct.classroomId);

    let presenca: { turma: string; presentes: number; ausentes: number; total: number } | null = null;
    if (classroomIds.length > 0) {
      const [presentes, ausentes] = await Promise.all([
        this.prisma.attendance.count({
          where: {
            classroomId: { in: classroomIds },
            date: { gte: startOfDay, lte: endOfDay },
            status: 'PRESENTE',
          },
        }),
        this.prisma.attendance.count({
          where: {
            classroomId: { in: classroomIds },
            date: { gte: startOfDay, lte: endOfDay },
            status: { not: 'PRESENTE' },
          },
        }),
      ]);
      const turmaNome = classroomTeachers[0]?.classroom?.name ?? '';
      presenca = {
        turma: turmaNome,
        presentes,
        ausentes,
        total: presentes + ausentes,
      };
    }

    // 4. Próximo evento de diário para hoje
    const proximoEvento = await this.prisma.diaryEvent.findFirst({
      where: {
        createdBy: user.sub,
        eventDate: { gte: startOfDay, lte: endOfDay },
      },
      orderBy: { eventDate: 'asc' },
      select: {
        id: true,
        title: true,
        eventDate: true,
        curriculumEntryId: true,
      },
    });

    // 5. Planejamentos pendentes de envio (RASCUNHO há mais de 2 dias)
    const twoDaysAgo = new Date();
    twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);
    const planejamentosPendentes = await this.prisma.planning.count({
      where: {
        createdBy: user.sub,
        status: 'RASCUNHO',
        createdAt: { lte: twoDaysAgo },
      },
    });

    return {
      date: todayStr,
      diaSemana: today.toLocaleDateString('pt-BR', {
        weekday: 'long',
        timeZone: 'America/Sao_Paulo',
      }),
      planejamentoAtivo: planning
        ? {
            id: planning.id,
            title: planning.title,
            status: planning.status,
            turma: (planning as any).classroom?.name ?? null,
            objetivosHoje,
          }
        : null,
      presenca,
      proximoEvento: proximoEvento
        ? {
            id: proximoEvento.id,
            title: proximoEvento.title,
            horario: proximoEvento.eventDate,
          }
        : null,
      alertas: {
        planejamentosPendentes,
      },
    };
  }
}
