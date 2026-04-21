import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AlertasService {
  private readonly logger = new Logger(AlertasService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Roda todo dia às 6h de segunda a sexta — analisa faltas dos últimos 30 dias
   * e gera alertas de evasão por criança
   */
  @Cron('0 6 * * 1-5') // 06:00 de segunda a sexta
  async analisarFaltas() {
    this.logger.log('CronJob: analisando faltas para alertas de evasão...');
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
        const childId       = matricula.childId;
        const classroomId   = matricula.classroomId;
        const unitId        = matricula.classroom.unitId;
        const mantenedoraId = matricula.classroom.unit.mantenedoraId;

        const registros = await (this.prisma as any).attendance.findMany({
          where: {
            childId,
            classroomId,
            date: { gte: trintaDiasAtras, lte: hoje },
          },
          orderBy: { date: 'desc' },
        }).catch(() => []);

        if (registros.length === 0) continue;

        const ausencias = registros.filter((r: any) => r.status === 'AUSENTE');
        const presentes = registros.filter((r: any) => r.status === 'PRESENTE');
        const totalDias = registros.length;
        const taxaFalta = totalDias > 0 ? ausencias.length / totalDias : 0;

        // Detectar faltas consecutivas (3 ou mais)
        let consecutivas = 0;
        let maxConsec = 0;
        for (const r of registros) {
          if ((r as any).status === 'AUSENTE') {
            consecutivas++;
            if (consecutivas > maxConsec) maxConsec = consecutivas;
          } else {
            consecutivas = 0;
          }
        }

        if (maxConsec >= 3) {
          await this.upsertAlerta({
            childId,
            classroomId,
            unitId,
            mantenedoraId,
            tipo: 'FALTAS_CONSECUTIVAS',
            titulo: `${matricula.child.firstName} — ${maxConsec} faltas consecutivas`,
            descricao: `A criança ${matricula.child.firstName} ${matricula.child.lastName} acumulou ${maxConsec} faltas consecutivas. Verificar com a família.`,
            dados: { maxConsec, totalFaltas: ausencias.length, totalDias },
          });
        }

        if (taxaFalta >= 0.25 && ausencias.length >= 5) {
          await this.upsertAlerta({
            childId,
            classroomId,
            unitId,
            mantenedoraId,
            tipo: 'FALTAS_FREQUENTES',
            titulo: `${matricula.child.firstName} — ${Math.round(taxaFalta * 100)}% de ausências`,
            descricao: `${ausencias.length} faltas nos últimos 30 dias (${Math.round(taxaFalta * 100)}%). Risco de evasão.`,
            dados: { taxaFalta, ausencias: ausencias.length, presentes: presentes.length, totalDias },
          });
        }

        await this.prisma.childProfileStats.upsert({
          where: { childId },
          create: {
            childId,
            unitId,
            mantenedoraId,
            totalFaltas: ausencias.length,
            faltasUltimos30Dias: ausencias.length,
            faltasConsecutivas: maxConsec,
            ultimaPresenca: (presentes[0] as any)?.date ?? null,
          },
          update: {
            totalFaltas: ausencias.length,
            faltasUltimos30Dias: ausencias.length,
            faltasConsecutivas: maxConsec,
            ultimaPresenca: (presentes[0] as any)?.date ?? undefined,
          },
        }).catch(() => {});
      }

      this.logger.log('CronJob faltas concluído.');
    } catch (err) {
      this.logger.error('Erro no CronJob de faltas:', err);
    }
  }

  /**
   * Roda todo dia às 6h30 de segunda a sexta — analisa padrões de microgestos
   */
  @Cron('30 6 * * 1-5')
  async analisarMicrogestos() {
    this.logger.log('CronJob: analisando padrões de microgestos...');
    try {
      const seteDiasAtras = new Date();
      seteDiasAtras.setDate(seteDiasAtras.getDate() - 7);

      const alertasNivel = await this.prisma.microgestoRegistro.groupBy({
        by: ['childId', 'classroomId', 'categoria'],
        where: {
          nivel: 'REQUER_ATENCAO',
          data: { gte: seteDiasAtras },
        },
        _count: { id: true },
        having: { id: { _count: { gte: 3 } } },
      }).catch(() => []);

      for (const item of alertasNivel) {
        const classroom = await this.prisma.classroom.findUnique({
          where: { id: item.classroomId },
          include: { unit: { select: { mantenedoraId: true } } },
        }).catch(() => null);
        if (!classroom) continue;

        const child = await this.prisma.child.findUnique({
          where: { id: item.childId },
          select: { firstName: true, lastName: true },
        }).catch(() => null);
        if (!child) continue;

        await this.upsertAlerta({
          childId: item.childId,
          classroomId: item.classroomId,
          unitId: classroom.unitId,
          mantenedoraId: classroom.unit.mantenedoraId,
          tipo: 'PADRAO_COMPORTAMENTO_NEGATIVO',
          titulo: `${child.firstName} — Padrão de atenção em ${item.categoria}`,
          descricao: `${item._count.id} registros "Requer Atenção" na área ${item.categoria} nos últimos 7 dias.`,
          dados: { categoria: item.categoria, count: item._count.id },
        });
      }

      this.logger.log('CronJob microgestos concluído.');
    } catch (err) {
      this.logger.error('Erro no CronJob de microgestos:', err);
    }
  }

  private async upsertAlerta(params: {
    childId: string;
    classroomId: string;
    unitId: string;
    mantenedoraId: string;
    tipo: string;
    titulo: string;
    descricao: string;
    dados: Record<string, any>;
  }) {
    const existente = await this.prisma.alertaAluno.findFirst({
      where: {
        childId: params.childId,
        tipo: params.tipo as any,
        status: 'ATIVO',
      },
    });
    if (existente) {
      await this.prisma.alertaAluno.update({
        where: { id: existente.id },
        data: { titulo: params.titulo, descricao: params.descricao, dados: params.dados },
      });
      return;
    }
    await this.prisma.alertaAluno.create({
      data: {
        childId: params.childId,
        classroomId: params.classroomId,
        unitId: params.unitId,
        mantenedoraId: params.mantenedoraId,
        tipo: params.tipo as any,
        titulo: params.titulo,
        descricao: params.descricao,
        dados: params.dados,
      },
    });
  }
}
