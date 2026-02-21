import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import type { JwtPayload } from '../auth/interfaces/jwt-payload.interface';

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
}
