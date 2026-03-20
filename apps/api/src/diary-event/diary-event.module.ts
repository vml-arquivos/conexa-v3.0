import { Module } from '@nestjs/common';
import { MulterModule } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { DiaryEventService } from './diary-event.service';
import { DiaryEventController } from './diary-event.controller';
import { AuditService } from '../common/services/audit.service';

@Module({
  imports: [
    MulterModule.register({
      storage: memoryStorage(),
      limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB
    }),
  ],
  controllers: [DiaryEventController],
  providers: [DiaryEventService, AuditService],
  exports: [DiaryEventService],
})
export class DiaryEventModule {}
