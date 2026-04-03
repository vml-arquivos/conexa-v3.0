import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import type { JwtPayload } from '../auth/interfaces/jwt-payload.interface';
import { Prisma, RoleLevel, RoleType } from '@prisma/client';
import { CreateCardapioDto } from './dto/create-cardapio.dto';
import { CardapioRefeicaoDto } from './dto/cardapio-refeicao.dto';
import { QueryCardapioDto } from './dto/query-cardapio.dto';

// ─── helpers ─────────────────────────────────────────────────────────────────

function resolveUnitId(user: JwtPayload, dtoUnitId?: string): string {
  const uid = dtoUnitId ?? user.unitId;
  if (!uid) throw new BadRequestException('unitId obrigatório');
  return uid;
}

// FASE 1: RoleTypes que têm acesso legítimo ao módulo de cardápio.
// Professor e outros perfis de UNIDADE sem tipo específico não devem operar cardápios.
const CARDAPIO_ALLOWED_TYPES: RoleType[] = [
  RoleType.UNIDADE_NUTRICIONISTA,
  RoleType.UNIDADE_DIRETOR,
  RoleType.UNIDADE_COORDENADOR_PEDAGOGICO,
  RoleType.UNIDADE_ADMINISTRATIVO,
];

function assertAccess(user: JwtPayload, unitId: string) {
  const level = user.roles[0]?.level;
  if (level === RoleLevel.DEVELOPER || level === RoleLevel.MANTENEDORA) return;
  if (level === RoleLevel.STAFF_CENTRAL) {
    const scopes = user.roles.flatMap((r) => r.unitScopes);
    if (scopes.length > 0 && !scopes.includes(unitId))
      throw new ForbiddenException('Sem acesso a esta unidade');
    return;
  }
  // UNIDADE: validar RoleType específico (FASE 1 — escopo correto)
  if (level === RoleLevel.UNIDADE) {
    const hasAllowedType = user.roles.some((r) =>
      CARDAPIO_ALLOWED_TYPES.includes(r.type as RoleType),
    );
    if (!hasAllowedType)
      throw new ForbiddenException('Perfil sem acesso ao módulo de cardápio');
    if (user.unitId !== unitId)
      throw new ForbiddenException('Sem acesso a esta unidade');
    return;
  }
  // PROFESSOR e demais: sem acesso ao módulo de cardápio
  throw new ForbiddenException('Sem acesso ao módulo de cardápio');
}

// ─── include padrão ──────────────────────────────────────────────────────────

const INCLUDE_FULL: Prisma.CardapioInclude = {
  refeicoes: {
    include: { itens: true },
    orderBy: [
      { diaSemana: Prisma.SortOrder.asc },
      { tipoRefeicao: Prisma.SortOrder.asc },
    ],
  },
};

// ─── Service ─────────────────────────────────────────────────────────────────

@Injectable()
export class CardapioService {
  constructor(private readonly prisma: PrismaService) {}

  // ── Listar ──────────────────────────────────────────────────────────────────
  async findAll(query: QueryCardapioDto, user: JwtPayload) {
    const unitId = query.unitId ?? user.unitId;
    if (unitId) assertAccess(user, unitId);

    const take = Math.min(Number(query.limit ?? 20), 200);
    const skip = Number(query.skip ?? 0);

    const where: Record<string, unknown> = { mantenedoraId: user.mantenedoraId };
    if (unitId) where.unitId = unitId;
    if (query.semana) {
      where.semana = query.semana;
    } else if (query.dataInicio || query.dataFim) {
      const semanaFilter: Record<string, string> = {};
      if (query.dataInicio) semanaFilter.gte = query.dataInicio;
      if (query.dataFim)   semanaFilter.lte = query.dataFim;
      where.semana = semanaFilter;
    }
    if (query.publicado !== undefined) where.publicado = query.publicado === 'true';

    const [total, items] = await this.prisma.$transaction([
      this.prisma.cardapio.count({ where }),
      this.prisma.cardapio.findMany({
        where,
        include: INCLUDE_FULL,
        orderBy: { semana: 'desc' },
        take,
        skip,
      }),
    ]);

    return { total, data: items.map((c) => this.enrich(c)) };
  }

  // ── Buscar por ID ────────────────────────────────────────────────────────────
  async findOne(id: string, user: JwtPayload) {
    const cardapio = await this.prisma.cardapio.findUnique({
      where: { id },
      include: INCLUDE_FULL,
    });
    if (!cardapio) throw new NotFoundException('Cardápio não encontrado');
    assertAccess(user, cardapio.unitId);
    return this.enrich(cardapio);
  }

  // ── Criar ────────────────────────────────────────────────────────────────────
  async create(dto: CreateCardapioDto, user: JwtPayload) {
    const unitId = resolveUnitId(user, dto.unitId);
    assertAccess(user, unitId);

    // Verificar se já existe para a semana
    const existing = await this.prisma.cardapio.findUnique({
      where: { unitId_semana: { unitId, semana: dto.semana } },
    });
    if (existing) throw new BadRequestException(`Já existe um cardápio para a semana ${dto.semana}`);

    const cardapio = await this.prisma.cardapio.create({
      data: {
        mantenedoraId: user.mantenedoraId,
        unitId,
        semana: dto.semana,
        titulo: dto.titulo,
        observacoes: dto.observacoes,
        publicado: dto.publicado ?? false,
        createdBy: user.sub,
        refeicoes: dto.refeicoes?.length
          ? { create: dto.refeicoes.map((r) => this.buildRefeicao(r)) }
          : undefined,
      },
      include: INCLUDE_FULL,
    });

    return this.enrich(cardapio);
  }

  // ── Atualizar ────────────────────────────────────────────────────────────────
  async update(id: string, dto: Partial<CreateCardapioDto>, user: JwtPayload) {
    const cardapio = await this.prisma.cardapio.findUnique({ where: { id } });
    if (!cardapio) throw new NotFoundException('Cardápio não encontrado');
    assertAccess(user, cardapio.unitId);

    // Atualizar campos simples
    const updated = await this.prisma.cardapio.update({
      where: { id },
      data: {
        titulo: dto.titulo ?? undefined,
        observacoes: dto.observacoes ?? undefined,
        publicado: dto.publicado ?? undefined,
      },
      include: INCLUDE_FULL,
    });

    return this.enrich(updated);
  }

  // ── Upsert Refeição ──────────────────────────────────────────────────────────
  async upsertRefeicao(cardapioId: string, dto: CardapioRefeicaoDto, user: JwtPayload) {
    const cardapio = await this.prisma.cardapio.findUnique({ where: { id: cardapioId } });
    if (!cardapio) throw new NotFoundException('Cardápio não encontrado');
    assertAccess(user, cardapio.unitId);

    // Buscar refeição existente
    const existing = await this.prisma.cardapioRefeicao.findUnique({
      where: {
        cardapioId_diaSemana_tipoRefeicao: {
          cardapioId,
          diaSemana: dto.diaSemana,
          tipoRefeicao: dto.tipoRefeicao,
        },
      },
    });

    if (existing) {
      // Deletar itens antigos e recriar
      await this.prisma.cardapioItem.deleteMany({ where: { refeicaoId: existing.id } });
      await this.prisma.cardapioRefeicao.update({
        where: { id: existing.id },
        data: {
          observacoes: dto.observacoes,
          itens: { create: dto.itens.map((i) => ({ ...i })) },
        },
      });
    } else {
      await this.prisma.cardapioRefeicao.create({
        data: {
          cardapioId,
          diaSemana: dto.diaSemana,
          tipoRefeicao: dto.tipoRefeicao,
          observacoes: dto.observacoes,
          itens: { create: dto.itens.map((i) => ({ ...i })) },
        },
      });
    }

    return this.findOne(cardapioId, user);
  }

  // ── Excluir ──────────────────────────────────────────────────────────────────
  async remove(id: string, user: JwtPayload) {
    const cardapio = await this.prisma.cardapio.findUnique({ where: { id } });
    if (!cardapio) throw new NotFoundException('Cardápio não encontrado');
    assertAccess(user, cardapio.unitId);

    await this.prisma.cardapio.delete({ where: { id } });
    return { deleted: true };
  }

  // ── Cálculo Nutricional ──────────────────────────────────────────────────────
  async calcularNutricao(id: string, user: JwtPayload) {
    const cardapio = await this.findOne(id, user);

    const diasMap: Record<string, Record<string, {
      refeicao: string;
      itens: number;
      calorias: number;
      proteinas: number;
      carboidratos: number;
      gorduras: number;
      fibras: number;
      sodio: number;
    }[]>> = {};

    for (const ref of (cardapio as any).refeicoes ?? []) {
      const dia = ref.diaSemana as string;
      if (!diasMap[dia]) diasMap[dia] = {};

      const totais = {
        refeicao: ref.tipoRefeicao as string,
        itens: ref.itens.length,
        calorias: 0, proteinas: 0, carboidratos: 0,
        gorduras: 0, fibras: 0, sodio: 0,
      };

      for (const item of ref.itens ?? []) {
        totais.calorias     += Number(item.calorias     ?? 0);
        totais.proteinas    += Number(item.proteinas    ?? 0);
        totais.carboidratos += Number(item.carboidratos ?? 0);
        totais.gorduras     += Number(item.gorduras     ?? 0);
        totais.fibras       += Number(item.fibras       ?? 0);
        totais.sodio        += Number(item.sodio        ?? 0);
      }

      if (!diasMap[dia][ref.tipoRefeicao]) diasMap[dia][ref.tipoRefeicao] = [];
      diasMap[dia][ref.tipoRefeicao].push(totais);
    }

    // Totais diários
    const resumoDiario = Object.entries(diasMap).map(([dia, refeicoes]) => {
      const totDia = { calorias: 0, proteinas: 0, carboidratos: 0, gorduras: 0, fibras: 0, sodio: 0 };
      const refs = Object.values(refeicoes).flat();
      for (const r of refs) {
        totDia.calorias     += r.calorias;
        totDia.proteinas    += r.proteinas;
        totDia.carboidratos += r.carboidratos;
        totDia.gorduras     += r.gorduras;
        totDia.fibras       += r.fibras;
        totDia.sodio        += r.sodio;
      }
      return { dia, refeicoes: refs, totais: totDia };
    });

    // Total semanal
    const totalSemanal = resumoDiario.reduce(
      (acc, d) => {
        acc.calorias     += d.totais.calorias;
        acc.proteinas    += d.totais.proteinas;
        acc.carboidratos += d.totais.carboidratos;
        acc.gorduras     += d.totais.gorduras;
        acc.fibras       += d.totais.fibras;
        acc.sodio        += d.totais.sodio;
        return acc;
      },
      { calorias: 0, proteinas: 0, carboidratos: 0, gorduras: 0, fibras: 0, sodio: 0 },
    );

    return {
      cardapioId: id,
      semana: (cardapio as any).semana,
      resumoDiario,
      totalSemanal,
      mediadiaria: {
        calorias:     +(totalSemanal.calorias     / (resumoDiario.length || 1)).toFixed(1),
        proteinas:    +(totalSemanal.proteinas    / (resumoDiario.length || 1)).toFixed(1),
        carboidratos: +(totalSemanal.carboidratos / (resumoDiario.length || 1)).toFixed(1),
        gorduras:     +(totalSemanal.gorduras     / (resumoDiario.length || 1)).toFixed(1),
        fibras:       +(totalSemanal.fibras       / (resumoDiario.length || 1)).toFixed(1),
        sodio:        +(totalSemanal.sodio        / (resumoDiario.length || 1)).toFixed(1),
      },
    };
  }

  // ── Helpers privados ─────────────────────────────────────────────────────────

  private buildRefeicao(r: CardapioRefeicaoDto) {
    return {
      diaSemana: r.diaSemana,
      tipoRefeicao: r.tipoRefeicao,
      observacoes: r.observacoes,
      itens: { create: r.itens.map((i) => ({ ...i })) },
    };
  }

  private enrich(cardapio: any) {
    // Adicionar totais nutricionais calculados a cada refeição
    const refeicoes = (cardapio.refeicoes ?? []).map((ref: any) => {
      const totais = ref.itens.reduce(
        (acc: any, item: any) => {
          acc.calorias     += Number(item.calorias     ?? 0);
          acc.proteinas    += Number(item.proteinas    ?? 0);
          acc.carboidratos += Number(item.carboidratos ?? 0);
          acc.gorduras     += Number(item.gorduras     ?? 0);
          acc.fibras       += Number(item.fibras       ?? 0);
          acc.sodio        += Number(item.sodio        ?? 0);
          return acc;
        },
        { calorias: 0, proteinas: 0, carboidratos: 0, gorduras: 0, fibras: 0, sodio: 0 },
      );
      return { ...ref, totaisNutricionais: totais };
    });
    return { ...cardapio, refeicoes };
  }
}
