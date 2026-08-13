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
   * Retorna 503 se o banco estiver inacessível OU se houver drift conhecido
   * entre o schema Prisma e o banco real (ex: enum PlanningType sem
   * QUINZENAL, ou coluna Planning.observacoes_template ausente). Esse tipo
   * de drift já aconteceu em produção (ver migration
   * 20260813040000_repair_planning_observacoes_template) e antes não era
   * detectado — o container ficava "ready" mesmo com o banco divergente do
   * client, e o erro só aparecia na primeira requisição real do usuário.
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
   * Verificações pontuais de drift conhecido entre prisma/schema.prisma e o
   * banco real. Não substitui `prisma migrate status`/`prisma validate` —
   * é uma rede de segurança específica para o incidente que já ocorreu.
   */
  private async checkKnownSchemaDrift(): Promise<string[]> {
    const problems: string[] = [];

    try {
      // Sanidade básica: a tabela Planning existe e é consultável.
      await this.prisma.$queryRawUnsafe('SELECT 1 FROM "Planning" LIMIT 0');
    } catch (e) {
      problems.push(`Tabela Planning não está acessível: ${e.message}`);
    }

    try {
      const quinzenal = await this.prisma.$queryRaw<Array<{ exists: boolean }>>`
        SELECT EXISTS (
          SELECT 1 FROM pg_enum
          WHERE enumtypid = (SELECT oid FROM pg_type WHERE typname = 'PlanningType')
          AND enumlabel = 'QUINZENAL'
        ) AS exists;
      `;
      if (!quinzenal?.[0]?.exists) {
        problems.push("Enum PlanningType não contém o valor 'QUINZENAL' no banco.");
      }
    } catch (e) {
      problems.push(`Não foi possível checar o enum PlanningType: ${e.message}`);
    }

    try {
      const coluna = await this.prisma.$queryRaw<Array<{ exists: boolean }>>`
        SELECT EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_name = 'Planning' AND column_name = 'observacoes_template'
        ) AS exists;
      `;
      if (!coluna?.[0]?.exists) {
        problems.push('Coluna Planning.observacoes_template não existe no banco.');
      }
    } catch (e) {
      problems.push(`Não foi possível checar Planning.observacoes_template: ${e.message}`);
    }

    return problems;
  }
}
