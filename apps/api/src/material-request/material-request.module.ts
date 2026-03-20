import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { MaterialRequestController } from './material-request.controller';
import { MaterialRequestService } from './material-request.service';
import { AuditService } from '../common/services/audit.service';

@Module({
  imports: [PrismaModule],
  controllers: [MaterialRequestController],
  providers: [MaterialRequestService, AuditService],
})
export class MaterialRequestModule {}
