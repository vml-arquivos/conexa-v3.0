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
      // Test database connection with simple query
      await this.prisma.$queryRaw`SELECT 1`;

      const schemaDrift = await this.checkKnownSchemaDrift();
      if (schemaDrift.length > 0) {
        throw new ServiceUnavailableException({
          status: 'not_ready',
          database: 'up',
          schemaDrift,
          timestamp,
        });
      }

      return {
        status: 'ready',
        database: 'up',
        planning: 'ready',
        timestamp,
      };
    } catch (error) {
      if (error instanceof ServiceUnavailableException) {
        throw error;
      }
      throw new ServiceUnavailableException({
        status: 'not_ready',
        database: 'down',
        error: error.message,
        timestamp,
      });
    }
  }

  /**
   * Verifica drift de schema conhecido do módulo Planning.
   *
   * INCIDENTE 2026-08-13: o /health/ready anterior só fazia `SELECT 1`, então
   * o container passava no healthcheck e começava a receber tráfego mesmo
   * com o banco de produção sem a coluna "Planning.observacoes_template" —
   * a migration que deveria criá-la nunca rodou de verdade porque uma
   * migration anterior na mesma cadeia falhava silenciosamente e era
   * mascarada pelo entrypoint (ver correção em entrypoint.sh). O sintoma era
   * "faz login normalmente, mas planejamento não carrega nem salva".
   * Esta checagem existe para que esse tipo de drift derrube o readiness em
   * vez de ficar invisível atrás de um "SELECT 1" verde.
   */
  private async checkKnownSchemaDrift(): Promise<string[]> {
    const problems: string[] = [];

    try {
      await this.prisma.$queryRawUnsafe('SELECT "observacoes_template" FROM "Planning" LIMIT 0');
    } catch {
      problems.push('Planning.observacoes_template ausente (migration de reparo não foi aplicada de verdade)');
    }

    try {
      const rows: Array<{ exists: boolean }> = await this.prisma.$queryRaw`
        SELECT EXISTS (
          SELECT 1 FROM pg_enum
          WHERE enumtypid = (SELECT oid FROM pg_type WHERE typname = 'PlanningType')
            AND enumlabel = 'QUINZENAL'
        ) AS exists
      `;
      if (!rows[0]?.exists) {
        problems.push('PlanningType.QUINZENAL ausente no enum do banco');
      }
    } catch {
      problems.push('Não foi possível verificar PlanningType.QUINZENAL');
    }

    try {
      await this.prisma.$queryRawUnsafe(
        'SELECT "reviewedAt", "reviewedBy", "reviewComment", "submittedAt", "anoLetivo", "professorId" FROM "Planning" LIMIT 0',
      );
    } catch {
      problems.push('Planning: colunas do fluxo de revisão (reviewedAt/reviewedBy/reviewComment/submittedAt/anoLetivo/professorId) ausentes');
    }

    return problems;
  }
}
