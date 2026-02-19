import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { addWeeks } from 'date-fns';

export interface CopyPlanningOptions {
  targetWeekStart?: Date;
  targetClassroomIds?: string[];
  copyStructureOnly?: boolean;
}

@Injectable()
export class PlanningReplicationService {
  constructor(private prisma: PrismaService) {}

  /**
   * Copia um planejamento para próxima semana
   */
  async copyToNextWeek(planningId: string, userId: string) {
    const planning = await this.findPlanningById(planningId);
    
    const nextWeekStart = addWeeks(new Date(planning.startDate), 1);
    const nextWeekEnd = addWeeks(new Date(planning.endDate), 1);
    
    const newPlanning = await this.prisma.planning.create({
      data: {
        title: `${planning.title} (Cópia)`,
        description: planning.description,
        type: planning.type,
        startDate: nextWeekStart,
        endDate: nextWeekEnd,
        classroomId: planning.classroomId,
        unitId: planning.unitId,
        mantenedoraId: planning.mantenedoraId,
        templateId: planning.templateId,
        curriculumMatrixId: planning.curriculumMatrixId,
        objectives: planning.objectives,
        activities: planning.activities || undefined,
        resources: planning.resources || undefined,
        evaluation: planning.evaluation,
        bnccAreas: planning.bnccAreas || undefined,
        curriculumAlignment: planning.curriculumAlignment,
        pedagogicalContent: planning.pedagogicalContent || undefined,
        status: 'RASCUNHO',
        createdBy: userId,
      },
    });
    
    return newPlanning;
  }

  /**
   * Copia um planejamento para outras turmas
   */
  async copyToClassrooms(
    planningId: string,
    targetClassroomIds: string[],
    userId: string,
  ) {
    const planning = await this.findPlanningById(planningId);
    
    const results: Array<{ classroomId: string; success: boolean; planningId?: string; error?: string }> = [];
    
    for (const classroomId of targetClassroomIds) {
      try {
        // Buscar classroom para pegar unitId
        const classroom = await this.prisma.classroom.findUnique({
          where: { id: classroomId },
          select: { unitId: true },
        });
        
        if (!classroom) {
          throw new Error('Turma não encontrada');
        }
        
        const copied = await this.prisma.planning.create({
          data: {
            title: `${planning.title} (Cópia)`,
            description: planning.description,
            type: planning.type,
            startDate: planning.startDate,
            endDate: planning.endDate,
            classroomId,
            unitId: classroom.unitId,
            mantenedoraId: planning.mantenedoraId,
            templateId: planning.templateId,
            curriculumMatrixId: planning.curriculumMatrixId,
            objectives: planning.objectives,
            activities: planning.activities || undefined,
            resources: planning.resources || undefined,
            evaluation: planning.evaluation,
            bnccAreas: planning.bnccAreas || undefined,
            curriculumAlignment: planning.curriculumAlignment,
            pedagogicalContent: planning.pedagogicalContent || undefined,
            status: 'RASCUNHO',
            createdBy: userId,
          },
        });
        
        results.push({ classroomId, success: true, planningId: copied.id });
      } catch (error) {
        results.push({ classroomId, success: false, error: error.message });
      }
    }
    
    return results;
  }

  /**
   * Duplica um planejamento como rascunho
   */
  async duplicateAsDraft(planningId: string, userId: string) {
    const planning = await this.findPlanningById(planningId);
    
    const newPlanning = await this.prisma.planning.create({
      data: {
        title: `${planning.title} (Cópia)`,
        description: planning.description,
        type: planning.type,
        startDate: planning.startDate,
        endDate: planning.endDate,
        classroomId: planning.classroomId,
        unitId: planning.unitId,
        mantenedoraId: planning.mantenedoraId,
        templateId: planning.templateId,
        curriculumMatrixId: planning.curriculumMatrixId,
        objectives: planning.objectives,
        activities: planning.activities || undefined,
        resources: planning.resources || undefined,
        evaluation: planning.evaluation,
        bnccAreas: planning.bnccAreas || undefined,
        curriculumAlignment: planning.curriculumAlignment,
        pedagogicalContent: planning.pedagogicalContent || undefined,
        status: 'RASCUNHO',
        createdBy: userId,
      },
    });
    
    return newPlanning;
  }

  /**
   * Busca planejamento por ID
   */
  private async findPlanningById(planningId: string) {
    const planning = await this.prisma.planning.findUnique({
      where: { id: planningId },
    });
    
    if (!planning) {
      throw new NotFoundException('Planejamento não encontrado');
    }
    
    return planning;
  }

  /**
   * Lista histórico de cópias de um planejamento
   */
  async getCopyHistory(planningId: string, userId: string) {
    const planning = await this.findPlanningById(planningId);
    
    const copies = await this.prisma.planning.findMany({
      where: {
        title: {
          contains: planning.title.replace(' (Cópia)', ''),
        },
        mantenedoraId: planning.mantenedoraId,
        id: { not: planningId },
      },
      include: {
        classroom: {
          select: {
            name: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: 20,
    });
    
    return copies;
  }
}
