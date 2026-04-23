import { Injectable, ForbiddenException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import type { JwtPayload } from '../auth/interfaces/jwt-payload.interface';
import { RoleLevel } from '@prisma/client';

function hasLevel(user: JwtPayload, ...levels: RoleLevel[]): boolean {
  return Array.isArray(user.roles) && user.roles.some((r: any) => levels.includes(r?.level));
}

@Injectable()
export class DevelopmentObservationsService {
  constructor(private readonly prisma: PrismaService) {}

  /** Professor cria observação individual de um aluno */
  async criar(dto: any, user: JwtPayload) {
    const {
      childId, classroomId, category, date,
      behaviorDescription, socialInteraction, emotionalState,
      motorSkills, cognitiveSkills, languageSkills,
      healthNotes, dietaryNotes, sleepPattern,
      learningProgress, planningParticipation, interests, challenges,
      psychologicalNotes, developmentAlerts,
      recommendations, nextSteps,
      atividadeArquivoUrl, atividadeArquivoNome,
      tags, indicadores,
    } = dto;

    return this.prisma.developmentObservation.create({
      data: {
        childId,
        classroomId: classroomId ?? null,
        category: category ?? 'GERAL',
        date: date ? new Date(date) : new Date(),
        behaviorDescription, socialInteraction, emotionalState,
        motorSkills, cognitiveSkills, languageSkills,
        healthNotes, dietaryNotes, sleepPattern,
        learningProgress, planningParticipation, interests, challenges,
        psychologicalNotes, developmentAlerts,
        recommendations, nextSteps,
        ...(atividadeArquivoUrl ? { atividadeArquivoUrl } : {}),
        ...(atividadeArquivoNome ? { atividadeArquivoNome } : {}),
        ...(tags !== undefined ? { tags } : {}),
        ...(indicadores !== undefined ? { indicadores } : {}),
        createdBy: user.sub,
      },
      include: { child: { select: { id: true, firstName: true, lastName: true, photoUrl: true } } },
    });
  }

  /** Listar observações — filtro por aluno, turma, categoria, período */
  async listar(query: any, user: JwtPayload) {
    const { childId, classroomId, category, startDate, endDate, limit } = query;
    const where: any = {};

    if (childId) where.childId = childId;
    if (classroomId) where.classroomId = classroomId;
    if (category) where.category = category;

    if (startDate || endDate) {
      where.date = {};
      if (startDate) where.date.gte = new Date(startDate);
      if (endDate) where.date.lte = new Date(endDate);
    }

    // Professor vê apenas observações que ele criou
    if (hasLevel(user, RoleLevel.PROFESSOR)) {
      where.createdBy = user.sub;
    }

    try {
      return await this.prisma.developmentObservation.findMany({
        where,
        orderBy: { date: 'desc' },
        take: Number(limit) || 100,
        include: {
          child: { select: { id: true, firstName: true, lastName: true, photoUrl: true } },
        },
      });
    } catch (error: any) {
      if (
        error?.code === 'P2021' &&
        String(error?.meta?.table ?? '').includes('development_observation')
      ) {
        return [];
      }
      throw error;
    }
  }

  /** Detalhe de uma observação */
  async getById(id: string) {
    const obs = await this.prisma.developmentObservation.findUnique({
      where: { id },
      include: { child: { select: { id: true, firstName: true, lastName: true, photoUrl: true } } },
    });
    if (!obs) throw new NotFoundException('Observação não encontrada');
    return obs;
  }

  /** Atualizar observação */
  async atualizar(id: string, dto: any, user: JwtPayload) {
    const obs = await this.prisma.developmentObservation.findUnique({ where: { id } });
    if (!obs) throw new NotFoundException('Observação não encontrada');

    if (hasLevel(user, RoleLevel.PROFESSOR) && obs.createdBy !== user.sub) {
      throw new ForbiddenException('Sem permissão para editar esta observação');
    }

    return this.prisma.developmentObservation.update({
      where: { id },
      data: { ...dto, date: dto.date ? new Date(dto.date) : obs.date },
      include: { child: { select: { id: true, firstName: true, lastName: true } } },
    });
  }

  /** Deletar observação */
  async deletar(id: string, user: JwtPayload) {
    const obs = await this.prisma.developmentObservation.findUnique({ where: { id } });
    if (!obs) throw new NotFoundException('Observação não encontrada');

    if (hasLevel(user, RoleLevel.PROFESSOR) && obs.createdBy !== user.sub) {
      throw new ForbiddenException('Sem permissão para excluir esta observação');
    }

    await this.prisma.developmentObservation.delete({ where: { id } });
    return { success: true };
  }

  /**
   * Evolução detalhada de um aluno por período — base para dashboard analítico
   * Retorna série histórica de observações agrupadas por semana
   */
  async evolucaoAluno(childId: string, periodoMeses = 3) {
    const dataInicio = new Date();
    dataInicio.setMonth(dataInicio.getMonth() - periodoMeses);

    const obs = await this.prisma.developmentObservation.findMany({
      where: { childId, date: { gte: dataInicio } },
      orderBy: { date: 'asc' },
      select: {
        id: true, date: true, category: true, tags: true, indicadores: true,
        emotionalState: true, developmentAlerts: true, recommendations: true,
        behaviorDescription: true, learningProgress: true,
        atividadeArquivoUrl: true,
      },
    }).catch(() => []);

    // Agrupar por semana
    const porSemana: Record<string, { semana: string; total: number; alertas: number; categorias: Record<string, number> }> = {};
    for (const o of obs) {
      const d = new Date(o.date);
      const semana = `${d.getFullYear()}-S${Math.ceil((d.getDate() + new Date(d.getFullYear(), d.getMonth(), 1).getDay()) / 7).toString().padStart(2, '0')}`;
      if (!porSemana[semana]) porSemana[semana] = { semana, total: 0, alertas: 0, categorias: {} };
      porSemana[semana].total++;
      if (o.developmentAlerts) porSemana[semana].alertas++;
      const cat = o.category ?? 'GERAL';
      porSemana[semana].categorias[cat] = (porSemana[semana].categorias[cat] ?? 0) + 1;
    }

    // Tags mais frequentes
    const tagContagem: Record<string, number> = {};
    for (const o of obs) {
      const tags: string[] = Array.isArray(o.tags) ? o.tags as string[] : [];
      for (const tag of tags) tagContagem[tag] = (tagContagem[tag] ?? 0) + 1;
    }
    const topTags = Object.entries(tagContagem)
      .sort((a, b) => b[1] - a[1]).slice(0, 10)
      .map(([tag, count]) => ({ tag, count }));

    const totalAlertas = obs.filter(o => o.developmentAlerts).length;
    const tendencia = totalAlertas > obs.length * 0.3 ? 'ATENCAO'
      : totalAlertas === 0 ? 'ESTAVEL' : 'MONITORAR';

    return {
      childId,
      periodoMeses,
      totalObs: obs.length,
      totalAlertas,
      tendencia,
      topTags,
      serieSemanal: Object.values(porSemana),
      ultimasObs: obs.slice(-5).reverse(),
    };
  }

  /** Resumo de desenvolvimento de um aluno (para relatório da coordenadora) */
  async resumoAluno(childId: string) {
    const [obs, total] = await Promise.all([
      this.prisma.developmentObservation.findMany({
        where: { childId },
        orderBy: { date: 'desc' },
        take: 20,
        include: { child: { select: { id: true, firstName: true, lastName: true } } },
      }),
      this.prisma.developmentObservation.count({ where: { childId } }),
    ]);

    const porCategoria = obs.reduce((acc: Record<string, number>, o) => {
      acc[o.category] = (acc[o.category] || 0) + 1;
      return acc;
    }, {});

    return { total, porCategoria, ultimas: obs };
  }

  /**
   * Resumo consolidado de uma turma: total de observações, por categoria,
   * crianças com e sem observações, alertas e recomendações.
   */
  async resumoTurma(classroomId: string) {
    const obs = await this.prisma.developmentObservation.findMany({
      where: { classroomId },
      orderBy: { date: 'desc' },
      include: {
        child: { select: { id: true, firstName: true, lastName: true } },
      },
    });

    const totalObs = obs.length;
    const porCategoria = obs.reduce((acc: Record<string, number>, o) => {
      acc[o.category] = (acc[o.category] || 0) + 1;
      return acc;
    }, {});

    // Agrupar por criança
    const porCrianca: Record<string, {
      id: string; nome: string; total: number;
      alertas: number; recomendacoes: number;
      categorias: Record<string, number>;
    }> = {};

    for (const o of obs) {
      const cid = o.childId;
      const nome = o.child
        ? `${o.child.firstName} ${o.child.lastName}`.trim()
        : cid;
      if (!porCrianca[cid]) {
        porCrianca[cid] = { id: cid, nome, total: 0, alertas: 0, recomendacoes: 0, categorias: {} };
      }
      porCrianca[cid].total++;
      if ((o as any).alert) porCrianca[cid].alertas++;
      if ((o as any).recommendation) porCrianca[cid].recomendacoes++;
      porCrianca[cid].categorias[o.category] = (porCrianca[cid].categorias[o.category] || 0) + 1;
    }

    const criancas = Object.values(porCrianca).sort((a, b) => b.total - a.total);
    const totalAlertas = obs.filter(o => (o as any).alert).length;
    const totalRecomendacoes = obs.filter(o => (o as any).recommendation).length;

    return {
      classroomId,
      totalObs,
      totalAlertas,
      totalRecomendacoes,
      totalCriancas: criancas.length,
      porCategoria,
      criancas,
    };
  }
}
