import { Module } from '@nestjs/common';
import { PlanningService } from './planning.service';
import { PlanningController } from './planning.controller';
import { AuditService } from '../common/services/audit.service';
import { AiModule } from '../ai/ai.module';

@Module({
  imports: [AiModule],
  controllers: [PlanningController],
  providers: [PlanningService, AuditService],
  exports: [PlanningService],
})
export class PlanningModule {}
