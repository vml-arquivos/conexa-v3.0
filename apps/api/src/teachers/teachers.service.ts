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
   */
  async getDashboard(user: JwtPayload) {
    // Buscar turmas do professor
    const classroomTeachers = await this.prisma.classroomTeacher.findMany({
      where: { teacherId: user.sub },
      include: {
        classroom: {
          include: {
            unit: {
              select: {
                id: true,
                name: true,
              },
            },
            children: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                birthDate: true,
                gender: true,
                photoUrl: true,
                isActive: true,
              },
              where: {
                isActive: true,
              },
              orderBy: {
                firstName: 'asc',
              },
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

    // Pegar primeira turma (professor geralmente tem 1 turma)
    const primaryClassroom = classroomTeachers[0].classroom;

    // Buscar estatísticas
    const totalAlunos = primaryClassroom.children.length;
    
    // Diários de bordo da semana
    const startOfWeek = new Date();
    startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());
    startOfWeek.setHours(0, 0, 0, 0);

    const diariosCount = await this.prisma.diaryEvent.count({
      where: {
        classroomId: primaryClassroom.id,
        eventDate: {
          gte: startOfWeek,
        },
      },
    });

    // Requisições pendentes
    const requisicoesCount = await this.prisma.materialRequest.count({
      where: {
        classroomId: primaryClassroom.id,
        createdBy: user.sub,
        status: {
          in: ['RASCUNHO', 'SOLICITADO'],
        },
      },
    });

    // Planejamentos da semana
    const planejamentosCount = await this.prisma.planning.count({
      where: {
        classroomId: primaryClassroom.id,
        weekStartDate: {
          gte: startOfWeek,
        },
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
      alunos: primaryClassroom.children.map((child) => ({
        id: child.id,
        nome: `${child.firstName} ${child.lastName}`,
        firstName: child.firstName,
        lastName: child.lastName,
        birthDate: child.birthDate,
        idade: this.calculateAge(child.birthDate),
        gender: child.gender,
        photoUrl: child.photoUrl,
      })),
      indicadores: {
        totalAlunos,
        diariosEstaSemananum: diariosCount,
        requisiçõesPendentes: requisicoesCount,
        planejamentosEstaSemananum: planejamentosCount,
      },
    };
  }

  /**
   * Calcular idade em meses
   */
  private calculateAge(birthDate: Date): number {
    const now = new Date();
    const birth = new Date(birthDate);
    const months = (now.getFullYear() - birth.getFullYear()) * 12 + (now.getMonth() - birth.getMonth());
    return months;
  }

  /**
   * Gerar planejamento semanal automaticamente baseado na matriz curricular
   */
  async generateWeeklyPlanning(dto: GeneratePlanningDto, user: JwtPayload) {
    // Buscar turma do professor
    const classroomTeacher = await this.prisma.classroomTeacher.findFirst({
      where: { teacherId: user.sub },
      include: {
        classroom: {
          include: {
            unit: true,
          },
        },
      },
    });

    if (!classroomTeacher) {
      throw new BadRequestException('Nenhuma turma encontrada para seu usuário');
    }

    const classroom = classroomTeacher.classroom;

    // Determinar faixa etária e matriz correspondente
    const ageGroupMin = classroom.ageGroupMin;
    let matrixCode: string;

    if (ageGroupMin >= 0 && ageGroupMin <= 18) {
      matrixCode = 'EI01-2026';
    } else if (ageGroupMin >= 19 && ageGroupMin <= 47) {
      matrixCode = 'EI02-2026';
    } else {
      matrixCode = 'EI03-2026';
    }

    // Buscar matriz curricular
    const matrix = await this.prisma.curriculumMatrix.findFirst({
      where: {
        code: matrixCode,
        isActive: true,
      },
    });

    if (!matrix) {
      throw new BadRequestException(`Matriz curricular ${matrixCode} não encontrada. Execute o seed da matriz.`);
    }

    // Buscar entradas da semana
    const weekStart = new Date(dto.weekStartDate);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 4); // Segunda a Sexta

    const entries = await this.prisma.curriculumMatrixEntry.findMany({
      where: {
        matrixId: matrix.id,
        date: {
          gte: weekStart,
          lte: weekEnd,
        },
      },
      orderBy: {
        date: 'asc',
      },
    });

    if (entries.length === 0) {
      throw new BadRequestException('Nenhuma entrada curricular encontrada para esta semana. Verifique a matriz.');
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
          // Professor preenche estes campos:
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
        code: matrix.code,
      },
      days: entries.length,
      content: planning.pedagogicalContent,
    };
  }
}
