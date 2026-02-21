import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import type { JwtPayload } from '../auth/interfaces/jwt-payload.interface';
import type { GeneratePlanningDto } from './dto/generate-planning.dto';
import { PlanningType, PlanningStatus } from '@prisma/client';

@Injectable()
export class TeachersService {
  constructor(private prisma: PrismaService) {}

  /**
   * Dashboard do professor com dados da turma e alunos
   * Alunos obtidos via enrollments -> child (relação correta no schema)
   */
  async getDashboard(user: JwtPayload) {
    const classroomTeachers = await this.prisma.classroomTeacher.findMany({
      where: { teacherId: user.sub, isActive: true },
      include: {
        classroom: {
          include: {
            unit: {
              select: { id: true, name: true },
            },
            enrollments: {
              where: { status: 'ATIVA' },
              include: {
                child: {
                  select: {
                    id: true,
                    firstName: true,
                    lastName: true,
                    dateOfBirth: true,
                    gender: true,
                    photoUrl: true,
                    isActive: true,
                  },
                },
              },
              orderBy: { child: { firstName: 'asc' } },
            },
          },
        },
      },
    });

    if (classroomTeachers.length === 0) {
      return {
        hasClassroom: false,
        message: 'Nenhuma turma encontrada para seu acesso.',
      };
    }

    const primaryClassroom = classroomTeachers[0].classroom;
    const alunos = primaryClassroom.enrollments.map((e) => e.child);
    const totalAlunos = alunos.length;

    const startOfWeek = new Date();
    startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());
    startOfWeek.setHours(0, 0, 0, 0);

    const diariosCount = await this.prisma.diaryEvent.count({
      where: {
        classroomId: primaryClassroom.id,
        eventDate: { gte: startOfWeek },
      },
    });

    const requisicoesCount = await this.prisma.materialRequest.count({
      where: {
        classroomId: primaryClassroom.id,
        createdBy: user.sub,
        status: { in: ['RASCUNHO', 'SOLICITADO'] },
      },
    });

    // Planejamentos da semana — usa startDate (campo correto no schema)
    const planejamentosCount = await this.prisma.planning.count({
      where: {
        classroomId: primaryClassroom.id,
        startDate: { gte: startOfWeek },
      },
    });

    return {
      hasClassroom: true,
      classroom: {
        id: primaryClassroom.id,
        name: primaryClassroom.name,
        code: primaryClassroom.code,
        ageGroupMin: primaryClassroom.ageGroupMin,
        ageGroupMax: primaryClassroom.ageGroupMax,
        capacity: primaryClassroom.capacity,
        unit: primaryClassroom.unit,
      },
      alunos: alunos.map((child) => ({
        id: child.id,
        nome: `${child.firstName} ${child.lastName}`,
        firstName: child.firstName,
        lastName: child.lastName,
        dateOfBirth: child.dateOfBirth,
        idade: this.calculateAge(child.dateOfBirth),
        gender: child.gender,
        photoUrl: child.photoUrl,
      })),
      indicadores: {
        totalAlunos,
        diariosEstaSemana: diariosCount,
        requisicoesStatus: requisicoesCount,
        planejamentosEstaSemana: planejamentosCount,
      },
    };
  }

  /**
   * Calcular idade em meses
   */
  private calculateAge(dateOfBirth: Date): number {
    const now = new Date();
    const birth = new Date(dateOfBirth);
    const months =
      (now.getFullYear() - birth.getFullYear()) * 12 +
      (now.getMonth() - birth.getMonth());
    return months;
  }

  /**
   * Gerar planejamento semanal automaticamente baseado na matriz curricular
   * CurriculumMatrix não tem campo "code" — busca por segment + year + mantenedoraId
   */
  async generateWeeklyPlanning(dto: GeneratePlanningDto, user: JwtPayload) {
    const classroomTeacher = await this.prisma.classroomTeacher.findFirst({
      where: { teacherId: user.sub },
      include: {
        classroom: {
          include: { unit: true },
        },
      },
    });

    if (!classroomTeacher) {
      throw new BadRequestException('Nenhuma turma encontrada para seu usuário');
    }

    const classroom = classroomTeacher.classroom;
    const ageGroupMin = classroom.ageGroupMin;

    // Determinar segmento da faixa etária (EI01 / EI02 / EI03)
    let segment: string;
    if (ageGroupMin >= 0 && ageGroupMin <= 18) {
      segment = 'EI01';
    } else if (ageGroupMin >= 19 && ageGroupMin <= 47) {
      segment = 'EI02';
    } else {
      segment = 'EI03';
    }

    // Buscar matriz curricular pelo segment + year (sem campo "code")
    const matrix = await this.prisma.curriculumMatrix.findFirst({
      where: {
        mantenedoraId: classroom.unit.mantenedoraId,
        segment,
        year: new Date().getFullYear(),
        isActive: true,
      },
    });

    if (!matrix) {
      throw new BadRequestException(
        `Matriz curricular para ${segment} não encontrada. Execute o seed da matriz.`,
      );
    }

    // Buscar entradas da semana
    const weekStart = new Date(dto.weekStartDate);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 4); // Segunda a Sexta

    const entries = await this.prisma.curriculumMatrixEntry.findMany({
      where: {
        matrixId: matrix.id,
        date: { gte: weekStart, lte: weekEnd },
      },
      orderBy: { date: 'asc' },
    });

    if (entries.length === 0) {
      throw new BadRequestException(
        'Nenhuma entrada curricular encontrada para esta semana. Verifique a matriz.',
      );
    }

    // Criar planejamento semanal
    const planning = await this.prisma.planning.create({
      data: {
        mantenedoraId: classroom.unit.mantenedoraId,
        unitId: classroom.unitId,
        classroomId: classroom.id,
        curriculumMatrixId: matrix.id,
        title: `Planejamento Semanal - ${weekStart.toLocaleDateString('pt-BR')}`,
        description: `Planejamento baseado na matriz ${matrix.name}`,
        type: PlanningType.SEMANAL,
        startDate: weekStart,
        endDate: weekEnd,
        status: PlanningStatus.RASCUNHO,
        createdBy: user.sub,
        pedagogicalContent: entries.map((entry) => ({
          date: entry.date,
          dayOfWeek: entry.dayOfWeek,
          campoDeExperiencia: entry.campoDeExperiencia,
          objetivoBNCC: entry.objetivoBNCC,
          objetivoBNCCCode: entry.objetivoBNCCCode,
          objetivoCurriculo: entry.objetivoCurriculo,
          intencionalidade: entry.intencionalidade,
          exemploAtividade: entry.exemploAtividade,
          atividadePlanejada: '',
          materiaisNecessarios: [],
          observacoes: '',
        })),
      },
    });

    return {
      id: planning.id,
      title: planning.title,
      weekStart: weekStart.toISOString(),
      weekEnd: weekEnd.toISOString(),
      matrix: {
        id: matrix.id,
        name: matrix.name,
        segment: matrix.segment,
        year: matrix.year,
      },
      days: entries.length,
      content: planning.pedagogicalContent,
    };
  }
}
