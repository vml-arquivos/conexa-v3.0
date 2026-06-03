import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditLogAction, AuditLogEntity } from '@prisma/client';

@Injectable()
export class AuditLogService {
  private readonly logger = new Logger(AuditLogService.name);

  constructor(private readonly prisma: PrismaService) {}

  async createLog(params: {
    userId?: string;
    unitId?: string;
    mantenedoraId?: string;
    action: AuditLogAction;
    entity: AuditLogEntity;
    entityId: string;
    description?: string;
    changes?: unknown;
    ipAddress?: string;
    userAgent?: string;
  }): Promise<void> {
    const {
      userId,
      unitId,
      mantenedoraId,
      action,
      entity,
      entityId,
      description,
      changes,
      ipAddress,
      userAgent,
    } = params;

    try {
      await this.prisma.auditLog.create({
        data: {
          userId,
          unitId,
          mantenedoraId,
          action,
          entity,
          entityId,
          description,
          changes: changes as any,
          ipAddress,
          userAgent,
        },
      });
    } catch (error) {
      this.logger.error(`Falha ao registrar log de auditoria: ${error}`);
    }
  }
}
