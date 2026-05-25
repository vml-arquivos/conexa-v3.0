import { BadRequestException, Injectable, ForbiddenException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import type { JwtPayload } from '../auth/interfaces/jwt-payload.interface';
import { RoleLevel } from '@prisma/client';
import * as fs from 'fs/promises';
import * as path from 'path';
import { randomUUID } from 'crypto';


const UPLOADS_ROOT_DIR = path.resolve(process.env.UPLOADS_DIR ?? 'uploads');
const DEVELOPMENT_ATTACHMENT_MARKER = '[ANEXO_ATIVIDADE]';

function safeFilename(name: string): string {
  return String(name || 'arquivo')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9._-]/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 120) || 'arquivo';
}

function extractDevelopmentAttachment(nextSteps?: string | null): any | null {
  if (!nextSteps) return null;
  const line = nextSteps
    .split('\n')
    .find((part) => part.trim().startsWith(DEVELOPMENT_ATTACHMENT_MARKER));
  if (!line) return null;
  const rawJson = line.replace(DEVELOPMENT_ATTACHMENT_MARKER, '').trim();
  try {
    return JSON.parse(rawJson);
  } catch {
    return null;
  }
}

function removeDevelopmentAttachmentMarker(nextSteps?: string | null): string {
  if (!nextSteps) return '';
  return nextSteps
    .split('\n')
    .filter((part) => !part.trim().startsWith(DEVELOPMENT_ATTACHMENT_MARKER))
    .join('\n')
    .trim();
}

function serializeDevelopmentObservation<T extends Record<string, any>>(obs: T): T & {
  atividadeArquivoUrl?: string;
  atividadeArquivoNome?: string;
  atividadeArquivoMimeType?: string;
  atividadeArquivoSize?: number;
} {
  const attachment = extractDevelopmentAttachment(obs?.nextSteps);
  if (!attachment) return obs as any;
  return {
    ...obs,
    atividadeArquivoUrl: attachment.url,
    atividadeArquivoNome: attachment.name,
    atividadeArquivoMimeType: attachment.mimeType,
    atividadeArquivoSize: attachment.size,
  };
}

function hasLevel(user: JwtPayload, ...levels: RoleLevel[]): boolean {
  return Array.isArray(user.roles) && user.roles.some((r: any) => levels.includes(r?.level));
}

function nullableText(value: unknown): string | null | undefined {
  if (value === undefined) return undefined;
  if (value === null) return null;
  const text = String(value).trim();
  return text.length > 0 ? text : null;
}

@Injectable()
export class DevelopmentObservationsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Professor/coordenador cria observação individual de uma criança.
   *
   * Regra de segurança desta correção:
   * - grava apenas campos existentes no model DevelopmentObservation do schema.prisma;
   * - ignora campos experimentais antigos que não existem no banco atual;
   * - não altera matriz, plano de aula, diário, RDIC ou qualquer dado histórico.
   */
  async criar(dto: any, user: JwtPayload) {
    const data = this.mapCreateData(dto, user);

    const obs = await this.prisma.developmentObservation.create({
      data,
      include: {
        child: { select: { id: true, firstName: true, lastName: true, photoUrl: true } },
      },
    });

    return serializeDevelopmentObservation(obs);
  }

  /** Listar observações — filtro por criança, turma, categoria e período. */
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

    // Professor vê apenas observações que ele criou.
    if (hasLevel(user, RoleLevel.PROFESSOR)) {
      where.createdBy = user.sub;
    }

    const obs = await this.prisma.developmentObservation.findMany({
      where,
      orderBy: { date: 'desc' },
      take: Number(limit) || 100,
      include: {
        child: { select: { id: true, firstName: true, lastName: true, photoUrl: true } },
      },
    });

    return obs.map((item) => serializeDevelopmentObservation(item));
  }

  /** Detalhe de uma observação. */
  async getById(id: string) {
    const obs = await this.prisma.developmentObservation.findUnique({
      where: { id },
      include: { child: { select: { id: true, firstName: true, lastName: true, photoUrl: true } } },
    });
    if (!obs) throw new NotFoundException('Observação não encontrada');
    return serializeDevelopmentObservation(obs);
  }

  /** Atualizar observação sem aceitar campos inexistentes no Prisma. */
  async atualizar(id: string, dto: any, user: JwtPayload) {
    const obs = await this.prisma.developmentObservation.findUnique({ where: { id } });
    if (!obs) throw new NotFoundException('Observação não encontrada');

    if (hasLevel(user, RoleLevel.PROFESSOR) && obs.createdBy !== user.sub) {
      throw new ForbiddenException('Sem permissão para editar esta observação');
    }

    const data = this.mapUpdateData(dto);

    const updated = await this.prisma.developmentObservation.update({
      where: { id },
      data,
      include: { child: { select: { id: true, firstName: true, lastName: true, photoUrl: true } } },
    });

    return serializeDevelopmentObservation(updated);
  }

  /** Deletar observação. */
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
   * Evolução detalhada de uma criança por período.
   * Mantém a análise em modo somente leitura e usa apenas campos existentes.
   */
  async evolucaoAluno(childId: string, periodoMeses = 3) {
    const dataInicio = new Date();
    dataInicio.setMonth(dataInicio.getMonth() - periodoMeses);

    const obs = await this.prisma.developmentObservation.findMany({
      where: { childId, date: { gte: dataInicio } },
      orderBy: { date: 'asc' },
      select: {
        id: true,
        date: true,
        category: true,
        emotionalState: true,
        developmentAlerts: true,
        recommendations: true,
        behaviorDescription: true,
        learningProgress: true,
      },
    });

    const porSemana: Record<string, { semana: string; total: number; alertas: number; categorias: Record<string, number> }> = {};
    for (const o of obs) {
      const d = new Date(o.date);
      const semana = `${d.getFullYear()}-S${Math.ceil((d.getDate() + new Date(d.getFullYear(), d.getMonth(), 1).getDay()) / 7).toString().padStart(2, '0')}`;
      if (!porSemana[semana]) porSemana[semana] = { semana, total: 0, alertas: 0, categorias: {} };
      porSemana[semana].total++;
      if (o.developmentAlerts) porSemana[semana].alertas++;
      const cat = o.category || 'GERAL';
      porSemana[semana].categorias[cat] = (porSemana[semana].categorias[cat] ?? 0) + 1;
    }

    const categorias = obs.reduce((acc: Record<string, number>, o) => {
      const cat = o.category || 'GERAL';
      acc[cat] = (acc[cat] || 0) + 1;
      return acc;
    }, {});

    const totalAlertas = obs.filter((o) => Boolean(o.developmentAlerts)).length;
    const tendencia = totalAlertas > obs.length * 0.3 ? 'ATENCAO'
      : totalAlertas === 0 ? 'ESTAVEL' : 'MONITORAR';

    return {
      childId,
      periodoMeses,
      totalObs: obs.length,
      totalAlertas,
      tendencia,
      categorias,
      serieSemanal: Object.values(porSemana),
      ultimasObs: obs.slice(-5).reverse().map((item) => serializeDevelopmentObservation(item)),
    };
  }

  /** Resumo de desenvolvimento de uma criança para coordenação/psicologia. */
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

    const totalAlertas = obs.filter((o) => Boolean(o.developmentAlerts)).length;
    const totalRecomendacoes = obs.filter((o) => Boolean(o.recommendations)).length;

    return { total, totalAlertas, totalRecomendacoes, porCategoria, ultimas: obs.map((item) => serializeDevelopmentObservation(item)) };
  }

  /** Resumo consolidado de uma turma. */
  async resumoTurma(classroomId: string) {
    const obs = await this.prisma.developmentObservation.findMany({
      where: { classroomId },
      orderBy: { date: 'desc' },
      include: {
        child: { select: { id: true, firstName: true, lastName: true } },
      },
    });

    const porCategoria = obs.reduce((acc: Record<string, number>, o) => {
      acc[o.category] = (acc[o.category] || 0) + 1;
      return acc;
    }, {});

    const porCrianca: Record<string, {
      id: string; nome: string; total: number;
      alertas: number; recomendacoes: number;
      categorias: Record<string, number>;
    }> = {};

    for (const o of obs) {
      const cid = o.childId;
      const nome = o.child ? `${o.child.firstName} ${o.child.lastName}`.trim() : cid;
      if (!porCrianca[cid]) {
        porCrianca[cid] = { id: cid, nome, total: 0, alertas: 0, recomendacoes: 0, categorias: {} };
      }
      porCrianca[cid].total++;
      if (o.developmentAlerts) porCrianca[cid].alertas++;
      if (o.recommendations) porCrianca[cid].recomendacoes++;
      porCrianca[cid].categorias[o.category] = (porCrianca[cid].categorias[o.category] || 0) + 1;
    }

    const criancas = Object.values(porCrianca).sort((a, b) => b.total - a.total);
    const totalAlertas = obs.filter((o) => Boolean(o.developmentAlerts)).length;
    const totalRecomendacoes = obs.filter((o) => Boolean(o.recommendations)).length;

    return {
      classroomId,
      totalObs: obs.length,
      totalAlertas,
      totalRecomendacoes,
      totalCriancas: criancas.length,
      porCategoria,
      criancas,
    };
  }


  /**
   * Upload de anexo da observação usando multipart/form-data.
   * Não usa base64 em JSON e não cria/migra campos no banco.
   * O link do arquivo é gravado em nextSteps com marcador técnico seguro.
   */
  async uploadAttachment(id: string, file: Express.Multer.File, user: JwtPayload) {
    if (!file) throw new BadRequestException('Arquivo é obrigatório');

    const allowedMimeTypes = new Set([
      'image/jpeg',
      'image/png',
      'image/webp',
      'image/gif',
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    ]);

    if (!allowedMimeTypes.has(file.mimetype)) {
      throw new BadRequestException('Tipo de arquivo não permitido. Envie imagem, PDF, DOC ou DOCX.');
    }

    const obs = await this.prisma.developmentObservation.findUnique({
      where: { id },
      include: { child: { select: { id: true, firstName: true, lastName: true, photoUrl: true } } },
    });
    if (!obs) throw new NotFoundException('Observação não encontrada');

    if (hasLevel(user, RoleLevel.PROFESSOR) && obs.createdBy !== user.sub) {
      throw new ForbiddenException('Sem permissão para anexar arquivo nesta observação');
    }

    const originalName = safeFilename(file.originalname || 'anexo');
    const extension = path.extname(originalName).slice(0, 16);
    const filename = `${Date.now()}-${randomUUID()}${extension}`;
    const relativeDir = path.join('development-observations', id);
    const absoluteDir = path.join(UPLOADS_ROOT_DIR, relativeDir);
    await fs.mkdir(absoluteDir, { recursive: true });
    await fs.writeFile(path.join(absoluteDir, filename), file.buffer);

    const attachment = {
      url: `/uploads/development-observations/${id}/${filename}`,
      name: originalName,
      mimeType: file.mimetype,
      size: file.size,
      uploadedAt: new Date().toISOString(),
    };

    const nextStepsBase = removeDevelopmentAttachmentMarker(obs.nextSteps);
    const nextSteps = `${nextStepsBase}${nextStepsBase ? '\n' : ''}${DEVELOPMENT_ATTACHMENT_MARKER} ${JSON.stringify(attachment)}`;

    const updated = await this.prisma.developmentObservation.update({
      where: { id },
      data: { nextSteps },
      include: { child: { select: { id: true, firstName: true, lastName: true, photoUrl: true } } },
    });

    return serializeDevelopmentObservation(updated);
  }

  private mapCreateData(dto: any, user: JwtPayload) {
    if (!dto?.childId) throw new Error('childId é obrigatório');

    return {
      childId: dto.childId,
      classroomId: dto.classroomId ?? null,
      category: dto.category ?? 'GERAL',
      date: dto.date ? new Date(dto.date) : new Date(),
      behaviorDescription: nullableText(dto.behaviorDescription),
      socialInteraction: nullableText(dto.socialInteraction),
      emotionalState: nullableText(dto.emotionalState),
      motorSkills: nullableText(dto.motorSkills),
      cognitiveSkills: nullableText(dto.cognitiveSkills),
      languageSkills: nullableText(dto.languageSkills),
      healthNotes: nullableText(dto.healthNotes),
      dietaryNotes: nullableText(dto.dietaryNotes),
      sleepPattern: nullableText(dto.sleepPattern),
      learningProgress: nullableText(dto.learningProgress),
      planningParticipation: nullableText(dto.planningParticipation),
      interests: nullableText(dto.interests),
      challenges: nullableText(dto.challenges),
      psychologicalNotes: nullableText(dto.psychologicalNotes),
      developmentAlerts: nullableText(dto.developmentAlerts),
      recommendations: nullableText(dto.recommendations),
      nextSteps: nullableText(dto.nextSteps),
      createdBy: user.sub,
    };
  }

  private mapUpdateData(dto: any) {
    const data: any = {};
    const allowedTextFields = [
      'behaviorDescription',
      'socialInteraction',
      'emotionalState',
      'motorSkills',
      'cognitiveSkills',
      'languageSkills',
      'healthNotes',
      'dietaryNotes',
      'sleepPattern',
      'learningProgress',
      'planningParticipation',
      'interests',
      'challenges',
      'psychologicalNotes',
      'developmentAlerts',
      'recommendations',
      'nextSteps',
    ];

    if (dto.category !== undefined) data.category = dto.category ?? 'GERAL';
    if (dto.classroomId !== undefined) data.classroomId = dto.classroomId ?? null;
    if (dto.date !== undefined) data.date = dto.date ? new Date(dto.date) : new Date();

    for (const field of allowedTextFields) {
      if (dto[field] !== undefined) data[field] = nullableText(dto[field]);
    }

    return data;
  }
}
