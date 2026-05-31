import { Module } from '@nestjs/common';
import { CurriculumMatrixService } from './curriculum-matrix.service';
import { CurriculumMatrixController } from './curriculum-matrix.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { AuditService } from '../common/services/audit.service';
// Tarefa 3.4 — RedisCacheModule expõe MatrixCacheInvalidationService (necessário para activate)
import { RedisCacheModule } from '../cache/redis-cache.module';

@Module({
  imports: [PrismaModule, RedisCacheModule],
  controllers: [CurriculumMatrixController],
  providers: [CurriculumMatrixService, AuditService],
  exports: [CurriculumMatrixService],
})
export class CurriculumMatrixModule {}
