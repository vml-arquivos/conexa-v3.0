import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class HealthService {
  constructor(private prisma: PrismaService) {}

  /**
   * Health check - NÃO depende do banco de dados
   * Usado pelo Coolify para verificar se o container está vivo
   * Retorna sempre 200 OK se o app está rodando
   */
  check() {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    };
  }

  /**
   * Readiness check - DEPENDE do banco de dados
   * Usado para verificar se o app está pronto para receber tráfego
   * Retorna 503 se o banco estiver inacessível
   */
  async ready() {
    const timestamp = new Date().toISOString();

    try {
      // Não basta a conexão aceitar SELECT 1: o Conexa depende do schema de
      // Planning para Plano de Aula e Diário. Validamos as colunas críticas e
      // o enum que já causaram 500 em produção, sem ler nem alterar registros.
      await this.prisma.$queryRaw`SELECT 1`;
      await this.prisma.$queryRawUnsafe(
        'SELECT "id", "type", "status", "observacoes_template", "submittedAt", "reviewedAt", "reviewedBy", "reviewComment", "anoLetivo", "professorId" FROM "Planning" LIMIT 0',
      );
      await this.prisma.$queryRawUnsafe(
        `SELECT 'QUINZENAL'::"PlanningType" AS "planningType"`,
      );

      return {
        status: 'ready',
        database: 'up',
        planning: 'ready',
        timestamp,
      };
    } catch (error) {
      throw new ServiceUnavailableException({
        status: 'not_ready',
        database: 'down',
        planning: 'not_ready',
        error: error instanceof Error ? error.message : String(error),
        timestamp,
      });
    }
  }
}
