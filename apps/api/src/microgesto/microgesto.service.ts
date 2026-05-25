import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import type { JwtPayload } from '../auth/interfaces/jwt-payload.interface';

export interface CreateMicrogestoDto {
  childIds: string[];
  classroomId: string;
  diaryEventId?: string;
  data: string;
  categoria: string;
  microgestoId: string;
  nivel: string;
  descricao?: string;
  campoExperiencia?: string;
  horario?: string;
  tags?: string[];
}

/**
 * Serviço mantido por compatibilidade.
 *
 * O schema.prisma atual não possui MicrogestoRegistro nem ChildProfileStats.
 * Para não quebrar build/deploy e para não criar dados paralelos, este service
 * não grava em modelos inexistentes. Microgestos livres continuam sendo tratados
 * no Diário de Bordo via campos JSON já existentes em DiaryEvent.
 */
@Injectable()
export class MicrogestoService {
  private readonly logger = new Logger(MicrogestoService.name);

  constructor(private readonly prisma: PrismaService) {}

  async registrar(dto: CreateMicrogestoDto, user: JwtPayload) {
    this.logger.warn(
      `MicrogestoService.registrar ignorado: schema atual não possui MicrogestoRegistro. classroomId=${dto.classroomId}; user=${user.sub}`,
    );
    return [];
  }

  async listarPorCrianca(childId: string, user: JwtPayload) {
    this.logger.warn(
      `MicrogestoService.listarPorCrianca ignorado: schema atual não possui MicrogestoRegistro. childId=${childId}; user=${user.sub}`,
    );
    return [];
  }

  async atualizarChildStats(childId: string, unitId: string, mantenedoraId: string) {
    this.logger.warn(
      `MicrogestoService.atualizarChildStats ignorado: schema atual não possui ChildProfileStats. childId=${childId}; unitId=${unitId}; mantenedoraId=${mantenedoraId}`,
    );
    return { success: true, skipped: true };
  }
}
