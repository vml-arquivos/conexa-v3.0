import { Injectable, Logger, Optional } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { GeminiService } from '../../ai/services/gemini.service';
import { PromptService } from '../prompt/prompt.service';

export interface ExecuteIaTaskParams {
  requestId: string;
  prompt: string;
  systemInstruction?: string;
  promptId?: string;
}

@Injectable()
export class IaExecutorService {
  private readonly logger = new Logger(IaExecutorService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly promptService: PromptService,
    @Optional() private readonly gemini: GeminiService,
  ) {}

  /**
   * Executa uma tarefa de IA:
   * 1. Marca a IaRequest como PROCESSANDO
   * 2. Chama o GeminiService
   * 3. Persiste IaResponse com resultado, tokens e custo estimado
   * 4. Marca a IaRequest como SUCESSO ou FALHA
   * 5. Registra logs em IaLog
   */
  async execute(params: ExecuteIaTaskParams): Promise<void> {
    const { requestId, prompt, systemInstruction, promptId } = params;

    await this.logEvent(requestId, 'started', 'Executor iniciou o processamento.');

    // Marcar como PROCESSANDO
    await this.prisma.iaRequest.update({
      where: { id: requestId },
      data: { status: 'PROCESSANDO', startedAt: new Date() },
    });

    try {
      if (!this.gemini?.isEnabled()) {
        throw new Error('GeminiService não está configurado (GEMINI_API_KEY ausente).');
      }

      const startTime = Date.now();

      // Executar chamada ao Gemini
      const result = await this.gemini.generateJSON<Record<string, unknown>>(
        prompt,
        systemInstruction,
      );

      const elapsedMs = Date.now() - startTime;

      // Estimar tokens (aproximação: 1 token ≈ 4 caracteres)
      const tokensPrompt = Math.ceil(prompt.length / 4);
      const tokensCompletion = Math.ceil(JSON.stringify(result).length / 4);
      // Custo estimado Gemini 1.5 Flash: ~$0.00015/1k tokens entrada, ~$0.0006/1k saída
      const totalCost =
        (tokensPrompt / 1000) * 0.00015 + (tokensCompletion / 1000) * 0.0006;

      // Buscar o prompt final interpolado se houver promptId
      let promptUsed: string | undefined = prompt;
      if (promptId) {
        try {
          const pt = await this.promptService.findOne(promptId);
          promptUsed = pt.template;
        } catch {
          // Não bloquear se o template não for encontrado
        }
      }

      // Persistir resposta
      await this.prisma.iaResponse.create({
        data: {
          requestId,
          result: result as Prisma.InputJsonValue,
          rawResponse: JSON.stringify(result),
          promptUsed,
          costTokensPrompt: tokensPrompt,
          costTokensCompletion: tokensCompletion,
          totalCost,
          modelUsed: 'gemini-1.5-flash',
          status: 'PENDENTE_REVISAO',
        },
      });

      // Marcar como SUCESSO
      await this.prisma.iaRequest.update({
        where: { id: requestId },
        data: { status: 'SUCESSO', completedAt: new Date() },
      });

      await this.logEvent(
        requestId,
        'completed',
        `Concluído em ${elapsedMs}ms. Tokens: ${tokensPrompt}+${tokensCompletion}. Custo: $${totalCost.toFixed(6)}.`,
      );

      this.logger.log(
        `IaRequest ${requestId} concluída em ${elapsedMs}ms.`,
      );
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);

      this.logger.error(`IaRequest ${requestId} falhou: ${errorMessage}`);

      // Marcar como FALHA
      await this.prisma.iaRequest.update({
        where: { id: requestId },
        data: {
          status: 'FALHA',
          completedAt: new Date(),
          errorMessage,
        },
      });

      await this.logEvent(requestId, 'failed', errorMessage);
    }
  }

  /**
   * Registra um evento no IaLog.
   */
  private async logEvent(
    requestId: string,
    event: string,
    message?: string,
  ): Promise<void> {
    try {
      await this.prisma.iaLog.create({
        data: { requestId, event, message },
      });
    } catch (err) {
      // Nunca deixar o log quebrar o fluxo principal
      this.logger.warn(`Falha ao registrar IaLog para ${requestId}: ${err}`);
    }
  }
}
