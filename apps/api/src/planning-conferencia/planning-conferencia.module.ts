import { Module } from '@nestjs/common';
import { PlanningConferenciaController } from './planning-conferencia.controller';
import { PlanningConferenciaService } from './planning-conferencia.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [PlanningConferenciaController],
  providers: [PlanningConferenciaService],
  exports: [PlanningConferenciaService],
})
export class PlanningConferenciaModule {}
