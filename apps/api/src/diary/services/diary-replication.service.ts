import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

export interface ReplicateDiaryOptions {
  targetClassroomIds: string[];
  targetDate?: Date;
  copyObservations?: boolean;
}

@Injectable()
export class DiaryReplicationService {
  constructor(private prisma: PrismaService) {}

  /**
   * Replica eventos de diário para múltiplas turmas
   */
  async replicateDiary(
    diaryEventId: string,
    options: ReplicateDiaryOptions,
    userId: string,
  ) {
    const originalEvent = await this.findDiaryEventById(diaryEventId);
    
    const results: Array<{ classroomId: string; success: boolean; diaryId?: string; error?: string }> = [];
    
    for (const classroomId of options.targetClassroomIds) {
      try {
        // Buscar classroom para pegar unitId
        const classroom = await this.prisma.classroom.findUnique({
          where: { id: classroomId },
          select: { unitId: true },
        });
        
        if (!classroom) {
          throw new Error('Turma não encontrada');
        }
        
        // Buscar uma criança da turma alvo para vincular o evento
        const targetChild = await this.prisma.child.findFirst({
          where: {
            enrollments: {
              some: {
                classroomId,
                status: 'ATIVA',
              },
            },
          },
        });
        
        if (!targetChild) {
          throw new Error('Nenhuma criança ativa encontrada nesta turma');
        }
        
        const replicated = await this.prisma.diaryEvent.create({
          data: {
            type: originalEvent.type,
            title: `${originalEvent.title} (Replicado)`,
            description: originalEvent.description,
            eventDate: options.targetDate || originalEvent.eventDate,
            observations: options.copyObservations ? originalEvent.observations : null,
            developmentNotes: options.copyObservations ? originalEvent.developmentNotes : null,
            behaviorNotes: options.copyObservations ? originalEvent.behaviorNotes : null,
            tags: originalEvent.tags || undefined,
            classroomId,
            childId: targetChild.id,
            unitId: classroom.unitId,
            mantenedoraId: originalEvent.mantenedoraId,
            planningId: originalEvent.planningId,
            curriculumEntryId: originalEvent.curriculumEntryId,
            status: 'RASCUNHO',
            createdBy: userId,
          },
        });
        
        results.push({ classroomId, success: true, diaryId: replicated.id });
      } catch (error) {
        results.push({ classroomId, success: false, error: error.message });
      }
    }
    
    return results;
  }

  /**
   * Copia estrutura do evento de diário sem dados específicos
   */
  async copyStructure(diaryEventId: string, targetDate: Date, userId: string) {
    const originalEvent = await this.findDiaryEventById(diaryEventId);
    
    const newEvent = await this.prisma.diaryEvent.create({
      data: {
        type: originalEvent.type,
        title: `${originalEvent.title} (Cópia)`,
        description: originalEvent.description,
        eventDate: targetDate,
        tags: originalEvent.tags || undefined,
        classroomId: originalEvent.classroomId,
        childId: originalEvent.childId,
        unitId: originalEvent.unitId,
        mantenedoraId: originalEvent.mantenedoraId,
        planningId: originalEvent.planningId,
        curriculumEntryId: originalEvent.curriculumEntryId,
        status: 'RASCUNHO',
        createdBy: userId,
      },
    });
    
    return newEvent;
  }

  /**
   * Busca evento de diário por ID
   */
  private async findDiaryEventById(diaryEventId: string) {
    const event = await this.prisma.diaryEvent.findUnique({
      where: { id: diaryEventId },
    });
    
    if (!event) {
      throw new NotFoundException('Evento de diário não encontrado');
    }
    
    return event;
  }
}
