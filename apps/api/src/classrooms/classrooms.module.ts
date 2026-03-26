import { Module } from '@nestjs/common';
import { ClassroomsController } from './classrooms.controller';
import { LookupModule } from '../lookup/lookup.module';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [LookupModule, PrismaModule],
  controllers: [ClassroomsController],
})
export class ClassroomsModule {}
