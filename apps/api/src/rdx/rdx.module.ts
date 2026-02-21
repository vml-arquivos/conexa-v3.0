import { Module } from '@nestjs/common';
import { RdxController } from './rdx.controller';
import { RdxService } from './rdx.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [RdxController],
  providers: [RdxService],
  exports: [RdxService],
})
export class RdxModule {}
