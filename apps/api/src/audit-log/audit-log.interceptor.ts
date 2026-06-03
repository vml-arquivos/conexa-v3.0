import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable, tap } from 'rxjs';
import { AuditLogAction, AuditLogEntity } from '@prisma/client';
import { AuditLogService } from './audit-log.service';

@Injectable()
export class AuditLogInterceptor implements NestInterceptor {
  constructor(private readonly auditLogService: AuditLogService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest();
    const { method, originalUrl, ip, headers } = request;
    const user = request.user;

    return next.handle().pipe(
      tap({
        next: () => {
          void this.auditLogService.createLog({
            userId: user?.id,
            unitId: user?.unitId,
            mantenedoraId: user?.mantenedoraId,
            action: this.mapAction(method),
            entity: this.mapEntity(originalUrl),
            entityId: originalUrl,
            description: `${method} ${originalUrl}`,
            ipAddress: ip,
            userAgent: headers?.['user-agent'],
          });
        },
      }),
    );
  }

  private mapAction(method: string): AuditLogAction {
    switch (method) {
      case 'POST':
        return 'CREATE';
      case 'PUT':
      case 'PATCH':
        return 'UPDATE';
      case 'DELETE':
        return 'DELETE';
      case 'GET':
      default:
        return 'VIEW';
    }
  }

  private mapEntity(originalUrl: string): AuditLogEntity {
    const path = originalUrl.toLowerCase();

    if (path.includes('/planning')) return 'PLANNING';
    if (path.includes('/diary')) return 'DIARY_EVENT';
    if (path.includes('/attendance')) return 'ATTENDANCE';
    if (path.includes('/material-request')) return 'MATERIAL_REQUEST';
    if (path.includes('/children')) return 'CHILD';
    if (path.includes('/classrooms')) return 'CLASSROOM';
    if (path.includes('/units')) return 'UNIT';
    if (path.includes('/users') || path.includes('/auth')) return 'USER';
    if (path.includes('/curriculum-matrix')) return 'CURRICULUM_MATRIX';

    return 'USER';
  }
}
