import { Module } from '@nestjs/common';
import { RdicController } from './rdic.controller';
import { RdicService } from './rdic.service';

@Module({
  controllers: [RdicController],
  providers: [RdicService],
  exports: [RdicService],
})
export class RdicModule {}
