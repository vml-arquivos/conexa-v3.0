import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { SeveridadeAlerta, TipoAlerta } from '@prisma/client';

@Injectable()
export class AlertasService {
  private readonly logger = new Logger(AlertasService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Roda todo dia às 6h de segunda a sexta — analisa faltas dos últimos 30 dias
   * e gera alertas operacionais por criança.
   *
   * Correção aplicada:
   * - usa modelos existentes no schema.prisma: Attendance e AlertaOperacional;
   * - não usa alertaAluno nem childProfileStats, que não existem no schema atual;
   * - não altera matriz, plano de aula, diário, RDIC ou dados históricos.
   */
  @Cron('0 6 * * 1-5')
  async analisarFaltas() {
    this.logger.log('CronJob: analisando faltas para alertas operacionais...');

    try {
      const matriculas = await this.prisma.enrollment.findMany({
        where: { status: 'ATIVA' },
        include: {
          child: { select: { id: true, firstName: true, lastName: true } },
          classroom: { select: { id: true, unitId: true, unit: { select: { mantenedoraId: true } } } },
        },
      });

      const hoje = new Date();
      const trintaDiasAtras = new Date();
      trintaDiasAtras.setDate(hoje.getDate() - 30);

      for (const matricula of matriculas) {
        const childId = matricula.childId;
        const classroomId = matricula.classroomId;
        const unitId = matricula.classroom.unitId;
        const mantenedoraId = matricula.classroom.unit.mantenedoraId;

        const registros = await this.prisma.attendance.findMany({
          where: {
            childId,
            classroomId,
            date: { gte: trintaDiasAtras, lte: hoje },
          },
          orderBy: { date: 'desc' },
        });

        if (registros.length === 0) continue;

        const ausencias = registros.filter((r) => r.status === 'AUSENTE');
        const presentes = registros.filter((r) => r.status === 'PRESENTE');
        const totalDias = registros.length;
        const taxaFalta = totalDias > 0 ? ausencias.length / totalDias : 0;

        let consecutivas = 0;
        let maxConsec = 0;
        for (const r of registros) {
          if (r.status === 'AUSENTE') {
            consecutivas++;
            if (consecutivas > maxConsec) maxConsec = consecutivas;
          } else {
            consecutivas = 0;
          }
        }

        if (maxConsec >= 3) {
          await this.upsertAlertaOperacional({
            childId,
            classroomId,
            unitId,
            mantenedoraId,
            tipo: TipoAlerta.FALTA_CONSECUTIVA,
            severidade: maxConsec >= 5 ? SeveridadeAlerta.ALTA : SeveridadeAlerta.MEDIA,
            titulo: `${matricula.child.firstName} — ${maxConsec} faltas consecutivas`,
            descricao: `A criança ${matricula.child.firstName} ${matricula.child.lastName} acumulou ${maxConsec} faltas consecutivas. Verificar com a família.`,
            metadados: { regra: 'FALTAS_CONSECUTIVAS', maxConsec, totalFaltas: ausencias.length, totalDias },
          });
        }

        if (taxaFalta >= 0.25 && ausencias.length >= 5) {
          await this.upsertAlertaOperacional({
            childId,
            classroomId,
            unitId,
            mantenedoraId,
            tipo: TipoAlerta.OUTRO,
            severidade: taxaFalta >= 0.4 ? SeveridadeAlerta.ALTA : SeveridadeAlerta.MEDIA,
            titulo: `${matricula.child.firstName} — ${Math.round(taxaFalta * 100)}% de ausências`,
            descricao: `${ausencias.length} faltas nos últimos 30 dias (${Math.round(taxaFalta * 100)}%). Risco de evasão.`,
            metadados: {
              regra: 'FALTAS_FREQUENTES',
              taxaFalta,
              ausencias: ausencias.length,
              presentes: presentes.length,
              totalDias,
              ultimaPresenca: presentes[0]?.date ?? null,
            },
          });
        }
      }

      this.logger.log('CronJob faltas concluído.');
    } catch (err) {
      this.logger.error('Erro no CronJob de faltas:', err as any);
    }
  }

  /**
   * Mantido como ponto de extensão, mas sem acesso a modelos inexistentes.
   * O schema atual não possui microgestoRegistro/childProfileStats; portanto
   * esta rotina não executa gravações até existir modelo oficial ou análise via DiaryEvent.
   */
  @Cron('30 6 * * 1-5')
  async analisarMicrogestos() {
    this.logger.log('CronJob microgestos ignorado: schema atual não possui modelo microgestoRegistro.');
  }

  private async upsertAlertaOperacional(params: {
    childId: string;
    classroomId: string;
    unitId: string;
    mantenedoraId: string;
    tipo: TipoAlerta;
    severidade: SeveridadeAlerta;
    titulo: string;
    descricao: string;
    metadados: Record<string, any>;
  }) {
    const regra = String(params.metadados?.regra ?? params.tipo);

    const existente = await this.prisma.alertaOperacional.findFirst({
      where: {
        childId: params.childId,
        tipo: params.tipo,
        resolvido: false,
        metadados: {
          path: ['regra'],
          equals: regra,
        },
      },
    });

    if (existente) {
      await this.prisma.alertaOperacional.update({
        where: { id: existente.id },
        data: {
          unitId: params.unitId,
          classroomId: params.classroomId,
          severidade: params.severidade,
          titulo: params.titulo,
          descricao: params.descricao,
          metadados: params.metadados,
        },
      });
      return;
    }

    await this.prisma.alertaOperacional.create({
      data: {
        childId: params.childId,
        classroomId: params.classroomId,
        unitId: params.unitId,
        mantenedoraId: params.mantenedoraId,
        tipo: params.tipo,
        severidade: params.severidade,
        titulo: params.titulo,
        descricao: params.descricao,
        metadados: params.metadados,
      },
    });
  }
}
