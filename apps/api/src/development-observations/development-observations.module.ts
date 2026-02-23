import { Module } from '@nestjs/common';
import { DevelopmentObservationsService } from './development-observations.service';
import { DevelopmentObservationsController } from './development-observations.controller';

@Module({
  controllers: [DevelopmentObservationsController],
  providers: [DevelopmentObservationsService],
  exports: [DevelopmentObservationsService],
})
export class DevelopmentObservationsModule {}
