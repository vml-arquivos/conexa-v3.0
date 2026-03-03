import { Controller, Get, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { JwtPayload } from '../auth/interfaces/jwt-payload.interface';
import { InsightsService } from './insights.service';

@Controller('insights')
@UseGuards(JwtAuthGuard)
export class InsightsController {
  constructor(private readonly insightsService: InsightsService) {}

  /**
   * GET /insights/teacher/today
   * Resumo do dia para o professor autenticado.
   */
  @Get('teacher/today')
  getTeacherToday(@CurrentUser() user: JwtPayload) {
    return this.insightsService.getTeacherToday(user);
  }
}
