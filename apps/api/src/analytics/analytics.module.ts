import { Module } from '@nestjs/common';
import { CacheModule } from '@nestjs/cache-manager';
import { AnalyticsController } from './analytics.controller';
import { AnalyticsService } from './analytics.service';
import { PrismaModule } from '../prisma/prisma.module';
import { AuditDashboardAccessInterceptor } from '../common/interceptors/audit-dashboard-access.interceptor';

@Module({
  imports: [
    PrismaModule,
    CacheModule.register({
      ttl: 60,      // 60s (UX 2s)
      max: 1000,
    }),
  ],
  controllers: [AnalyticsController],
  providers: [AnalyticsService, AuditDashboardAccessInterceptor],
  exports: [AnalyticsService],
})
export class AnalyticsModule {}
