import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { IntelligenceCoreController } from './intelligence-core.controller';
import { IntelligenceCoreService } from './intelligence-core.service';

@Module({
  imports: [PrismaModule],
  controllers: [IntelligenceCoreController],
  providers: [IntelligenceCoreService],
  exports: [IntelligenceCoreService],
})
export class IntelligenceCoreModule {}
