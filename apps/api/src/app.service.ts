import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { CurriculumMatrixEntryService } from './curriculum-matrix-entry/curriculum-matrix-entry.service';

@Injectable()
export class AppService implements OnModuleInit {
  private readonly logger = new Logger(AppService.name);

  constructor(
    private readonly curriculumMatrixEntryService: CurriculumMatrixEntryService,
  ) {}

  async onModuleInit() {
    try {
      const result = await this.curriculumMatrixEntryService.seedW6W8();
      this.logger.log(
        `[seed-w6w8] inserted=${result.inserted} updated=${result.updated} maxDate=${result.maxDate}`,
      );
    } catch (err) {
      this.logger.warn(`[seed-w6w8] skipped or failed: ${(err as Error)?.message}`);
    }
  }

  getHello(): string {
    return 'Hello World!';
  }
}
