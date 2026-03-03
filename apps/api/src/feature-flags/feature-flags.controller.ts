import { Controller, Get, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { JwtPayload } from '../auth/interfaces/jwt-payload.interface';
import { FeatureFlagsService } from './feature-flags.service';

/**
 * GET /feature-flags
 * Retorna as feature flags ativas para o usuário autenticado.
 * Usado pelo frontend para habilitar/desabilitar funcionalidades por role ou mantenedora.
 */
@Controller('feature-flags')
@UseGuards(JwtAuthGuard)
export class FeatureFlagsController {
  constructor(private readonly featureFlagsService: FeatureFlagsService) {}

  @Get()
  getFlags(@CurrentUser() user: JwtPayload) {
    return this.featureFlagsService.getFlagsForUser(user);
  }
}
