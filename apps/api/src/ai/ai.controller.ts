import { Controller, Get, ServiceUnavailableException } from '@nestjs/common';
import { GeminiService } from './services/gemini.service';

/**
 * Controller apenas para validação interna da integração com IA.
 */
@Controller('internal/ai')
export class AiController {
  constructor(private readonly geminiService: GeminiService) {}

  @Get('gemini/ping')
  async ping() {
    // Bloqueia em produção (como medida de segurança adicional,
    // embora o guard pudesse ser usado, a especificação pede para
    // bloquear em produção se não usar guard).
    if (process.env.NODE_ENV === 'production') {
      throw new ServiceUnavailableException('Endpoint indisponível em produção.');
    }

    if (!this.geminiService.isEnabled()) {
      throw new ServiceUnavailableException('IA não configurada');
    }

    try {
      const response = await this.geminiService.generateText('Olá!');
      return {
        status: 'ok',
        provider: 'Google Gemini',
        response,
      };
    } catch (error) {
      throw new ServiceUnavailableException('Falha ao comunicar com a IA');
    }
  }
}
