import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateMaterialRequestDto, MaterialRequestTypeInput } from './dto/create-material-request.dto';
import { ReviewDecision, ReviewMaterialRequestDto } from './dto/review-material-request.dto';
import { MaterialRequestType, RequestStatus, RoleLevel } from '@prisma/client';
import type { JwtPayload } from '../auth/interfaces/jwt-payload.interface';

function mapType(input?: MaterialRequestTypeInput): MaterialRequestType {
  if (!input) return 'OUTRO' as MaterialRequestType;
  const map: Record<string, string> = {
    HIGIENE: 'HIGIENE',
    LIMPEZA: 'LIMPEZA',
    PEDAGOGICO: 'PEDAGOGICO',
    ALIMENTACAO: 'ALIMENTACAO',
    OUTRO: 'OUTRO',
    HYGIENE: 'HIGIENE',
    PEDAGOGICAL: 'PEDAGOGICO',
  };
  const mapped = map[input];
  if (mapped && (MaterialRequestType as Record<string, string>)[mapped]) {
    return (MaterialRequestType as Record<string, string>)[mapped] as MaterialRequestType;
  }
  return 'OUTRO' as MaterialRequestType;
}

function isProfessorRole(user: JwtPayload): boolean {
  return (
    Array.isArray(user.roles) &&
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    user.roles.some((r: any) =>
      r?.level === RoleLevel.PROFESSOR ||
      r?.level === RoleLevel.DEVELOPER,
    )
  );
}

function isCoordRole(user: JwtPayload): boolean {
  return (
    Array.isArray(user.roles) &&
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    user.roles.some((r: any) => r?.level === RoleLevel.UNIDADE || r?.level === RoleLevel.DEVELOPER)
  );
}

function isCentralRole(user: JwtPayload): boolean {
  return (
    Array.isArray(user.roles) &&
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    user.roles.some((r: any) =>
      r?.level === RoleLevel.STAFF_CENTRAL ||
      r?.level === RoleLevel.MANTENEDORA ||
      r?.level === RoleLevel.DEVELOPER,
    )
  );
}

/**
 * Parseia o campo description para extrair dados legados (urgencia, justificativa, itens)
 * e dados de revisão (reviewData). Nunca lança exceção.
 */
function parseDescription(description: string | null): {
  urgencia: string | null;
  justificativa: string | null;
  observacaoRevisao: string | null;
  statusVirtual: string | null;
  originalItens: { item: string; quantidade: number; unidade?: string }[] | null;
  reviewData: Record<string, unknown> | null;
  originalData: Record<string, unknown> | null;
} {
  const result = {
    urgencia: null as string | null,
    justificativa: null as string | null,
    observacaoRevisao: null as string | null,
    statusVirtual: null as string | null,
    originalItens: null as { item: string; quantidade: number; unidade?: string }[] | null,
    reviewData: null as Record<string, unknown> | null,
    originalData: null as Record<string, unknown> | null,
  };
  if (!description) return result;
  try {
    const parsed = JSON.parse(description) as Record<string, unknown>;
    if (parsed._review) {
      result.reviewData = parsed;
      result.observacaoRevisao = typeof parsed.notes === 'string' ? parsed.notes : null;
      result.statusVirtual = parsed._parcial ? 'PARCIAL' : null;
      if (parsed._originalData) {
        const orig = parsed._originalData as Record<string, unknown>;
        result.originalData = orig;
        result.urgencia = typeof orig.urgencia === 'string' ? orig.urgencia : null;
        result.justificativa = typeof orig.justificativa === 'string' ? orig.justificativa : null;
        if (Array.isArray(orig.itens)) {
          result.originalItens = orig.itens as { item: string; quantidade: number; unidade?: string }[];
        }
      }
    } else {
      result.originalData = parsed;
      result.urgencia = typeof parsed.urgencia === 'string' ? parsed.urgencia : null;
      result.justificativa = typeof parsed.justificativa === 'string' ? parsed.justificativa : null;
      if (Array.isArray(parsed.itens)) {
        result.originalItens = parsed.itens as { item: string; quantidade: number; unidade?: string }[];
      }
    }
  } catch { /* ignora description não-JSON */ }
  return result;
}

/**
 * Normaliza os itens de uma requisição para o formato unificado de resposta.
 * Prioridade: itens relacionais (MaterialRequestItem) > itens legados (description.itens)
 */
function normalizeItems(
  items: Array<{
    id: string;
    productName: string;
    quantity: number;
    unit?: string | null;
    observations?: string | null;
    materialId?: string | null;
    unitPrice?: unknown;
    supplier?: string | null;
  }>,
  reviewDecisions: Array<{ itemId: string; approved: boolean; qtyApproved: number; reason?: string | null }>,
  legacyItens: { item: string; quantidade: number; unidade?: string }[] | null,
) {
  if (items.length > 0) {
    return items.map(item => {
      const decision = reviewDecisions.find(d => d.itemId === item.id);
      return {
        id: item.id,
        materialId: item.materialId ?? null,
        productName: item.productName,
        materialName: item.productName, // alias para compatibilidade com frontend
        quantity: item.quantity,
        unit: item.unit ?? null,
        observations: item.observations ?? null,
        qtyApproved: decision ? decision.qtyApproved : null,
        approved: decision ? decision.approved : null,
        approvalReason: decision?.reason ?? null,
      };
    });
  }
  // Fallback: itens legados do description
  if (legacyItens && legacyItens.length > 0) {
    return legacyItens.map((it, idx) => ({
      id: `legacy-${idx}`,
      materialId: null,
      productName: it.item,
      materialName: it.item,
      quantity: it.quantidade,
      unit: it.unidade ?? null,
      observations: null,
      qtyApproved: null,
      approved: null,
      approvalReason: null,
    }));
  }
  return [];
}

@Injectable()
export class MaterialRequestService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateMaterialRequestDto, user: JwtPayload) {
    if (!user?.mantenedoraId) throw new ForbiddenException('Escopo inválido');
    if (!isProfessorRole(user)) throw new ForbiddenException('Apenas PROFESSOR pode solicitar');

    // Resolver unitId: JWT > turma do DTO > primeira turma ativa do professor
    let resolvedUnitId = user.unitId;
    if (!resolvedUnitId) {
      if (dto.classroomId) {
        const classroom = await this.prisma.classroom.findUnique({
          where: { id: dto.classroomId },
          select: { unitId: true },
        });
        resolvedUnitId = classroom?.unitId ?? undefined;
      }
      if (!resolvedUnitId) {
        const ct = await this.prisma.classroomTeacher.findFirst({
          where: { teacherId: user.sub, isActive: true },
          include: { classroom: { select: { unitId: true } } },
        });
        resolvedUnitId = ct?.classroom?.unitId ?? undefined;
      }
      if (!resolvedUnitId) {
        throw new ForbiddenException('Professor sem unidade vinculada. Contate a coordenação.');
      }
    }

    const code = `MR-${Date.now()}`;
    const title = dto.titulo || dto.item || 'Requisição de Material';
    const type = mapType(dto.categoria || dto.type);
    const priorityMap: Record<string, string> = { BAIXA: 'baixa', MEDIA: 'normal', ALTA: 'alta' };
    const priority = dto.urgencia ? (priorityMap[dto.urgencia] ?? 'normal') : 'normal';

    // Normalizar itens: suporta novo formato (dto.itens) e legado (dto.item + dto.quantity)
    const itensParaPersistir: Array<{ productName: string; quantity: number; unit?: string }> = [];
    if (dto.itens && dto.itens.length > 0) {
      for (const it of dto.itens) {
        if (it.item?.trim()) {
          itensParaPersistir.push({
            productName: it.item.trim(),
            quantity: it.quantidade ?? 1,
            unit: it.unidade,
          });
        }
      }
    } else if (dto.item) {
      itensParaPersistir.push({
        productName: dto.item.trim(),
        quantity: dto.quantity ?? 1,
      });
    }

    // quantity total = soma dos itens (ou 1 se não houver itens)
    const totalQuantity = itensParaPersistir.reduce((acc, it) => acc + it.quantity, 0) || 1;

    // description: armazena metadados (justificativa, urgencia) sem duplicar itens
    // Itens agora vivem exclusivamente na tabela MaterialRequestItem
    const descriptionData: Record<string, unknown> = {};
    if (dto.justificativa) descriptionData.justificativa = dto.justificativa;
    if (dto.urgencia) descriptionData.urgencia = dto.urgencia;
    if (dto.descricao) descriptionData.descricao = dto.descricao;
    const description = Object.keys(descriptionData).length > 0
      ? JSON.stringify(descriptionData)
      : undefined;

    // Criar requisição + itens em uma única transação
    const created = await this.prisma.materialRequest.create({
      data: {
        mantenedoraId: user.mantenedoraId,
        unitId: resolvedUnitId,
        classroomId: dto.classroomId ?? null,
        code,
        title,
        description,
        type,
        quantity: totalQuantity,
        priority,
        status: RequestStatus.SOLICITADO,
        createdBy: user.sub,
        items: itensParaPersistir.length > 0
          ? {
              create: itensParaPersistir.map(it => ({
                productName: it.productName,
                quantity: it.quantity,
                unit: it.unit ?? null,
              })),
            }
          : undefined,
      },
      include: {
        items: true,
        classroom: { select: { id: true, name: true } },
      },
    });

    const desc = parseDescription(created.description ?? null);
    return {
      ...created,
      urgencia: desc.urgencia,
      justificativa: desc.justificativa,
      items: normalizeItems(created.items, [], null),
    };
  }

  async listMine(user: JwtPayload) {
    if (!user?.mantenedoraId) throw new ForbiddenException('Escopo inválido');
    const where: Record<string, unknown> = {
      mantenedoraId: user.mantenedoraId,
      createdBy: user.sub,
    };
    if (user.unitId) where.unitId = user.unitId;

    // Tenta buscar com items relacionais; se o Prisma client não conhecer a relação
    // (client não regenerado após migration), faz fallback sem include items.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let result: any[];
    try {
      result = await this.prisma.materialRequest.findMany({
        where: where as any,
        include: {
          createdByUser: { select: { id: true, firstName: true, lastName: true, email: true } },
          classroom: { select: { id: true, name: true } },
          items: true,
        },
        orderBy: { requestedDate: 'desc' },
        take: 100,
      });
    } catch {
      // Fallback: busca sem items (Prisma client desatualizado antes do prisma generate)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      result = await (this.prisma.materialRequest as any).findMany({
        where: where as any,
        include: {
          createdByUser: { select: { id: true, firstName: true, lastName: true, email: true } },
          classroom: { select: { id: true, name: true } },
        },
        orderBy: { requestedDate: 'desc' },
        take: 100,
      });
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return result.map((r: any) => {
      const desc = parseDescription(r.description ?? null);
      return {
        ...r,
        urgencia: desc.urgencia,
        justificativa: desc.justificativa,
        observacaoRevisao: desc.observacaoRevisao,
        statusVirtual: desc.statusVirtual,
        approvedDate: r.approvedDate?.toISOString() ?? null,
        items: normalizeItems(r.items ?? [], [], desc.originalItens),
        originalItens: desc.originalItens,
      };
    });
  }

  async list(
    user: JwtPayload,
    filters?: { status?: string; classroomId?: string; type?: string },
  ) {
    if (!user?.mantenedoraId) throw new ForbiddenException('Escopo inválido');
    const extra: Record<string, unknown> = {};
    if (filters?.status) extra.status = filters.status;
    if (filters?.classroomId) extra.classroomId = filters.classroomId;
    if (filters?.type) extra.type = filters.type;

    const includeClause = {
      createdByUser: { select: { id: true, firstName: true, lastName: true, email: true } },
      classroom: { select: { id: true, name: true } },
      items: true,
    };

    const mapRows = (rows: any[]) =>
      rows.map(r => {
        const desc = parseDescription(r.description ?? null);
        return {
          ...r,
          urgencia: desc.urgencia,
          justificativa: desc.justificativa,
          observacaoRevisao: desc.observacaoRevisao,
          statusVirtual: desc.statusVirtual,
          approvedDate: r.approvedDate?.toISOString() ?? null,
          items: normalizeItems(r.items ?? [], [], desc.originalItens),
          originalItens: desc.originalItens,
        };
      });

    if (isCentralRole(user)) {
      const rows = await this.prisma.materialRequest.findMany({
        where: { mantenedoraId: user.mantenedoraId, ...extra } as any,
        include: includeClause,
        orderBy: { requestedDate: 'desc' },
        take: 500,
      });
      return mapRows(rows);
    }

    if (!user?.unitId) throw new ForbiddenException('Escopo inválido');
    if (!isCoordRole(user)) throw new ForbiddenException('Apenas COORDENADOR pode listar todas as requisições');

    const rows = await this.prisma.materialRequest.findMany({
      where: { mantenedoraId: user.mantenedoraId, unitId: user.unitId, ...extra } as any,
      include: includeClause,
      orderBy: { requestedDate: 'desc' },
      take: 200,
    });
    return mapRows(rows);
  }

  async getById(id: string, user: JwtPayload) {
    if (!user?.mantenedoraId) throw new ForbiddenException('Escopo inválido');
    const req = await this.prisma.materialRequest.findUnique({
      where: { id },
      include: {
        createdByUser: { select: { id: true, firstName: true, lastName: true, email: true } },
        classroom: { select: { id: true, name: true } },
        items: { include: { material: { select: { id: true, name: true, unit: true } } } },
      },
    });
    if (!req) throw new NotFoundException('Requisição não encontrada');
    if (req.mantenedoraId !== user.mantenedoraId) throw new ForbiddenException('Fora do escopo');
    if (isCoordRole(user) && !isCentralRole(user) && user.unitId && req.unitId !== user.unitId) {
      throw new ForbiddenException('Requisição não pertence à sua unidade');
    }

    const desc = parseDescription(req.description ?? null);

    // Merge qtyApproved/approved nos itens do banco (vem do reviewData.items)
    type ItemDecision = { itemId: string; approved: boolean; qtyApproved: number; reason?: string | null };
    const itemDecisions: ItemDecision[] = Array.isArray(desc.reviewData?.items)
      ? (desc.reviewData!.items as ItemDecision[])
      : [];

    const statusVirtual = desc.reviewData?._parcial ? 'PARCIAL' : req.status;

    return {
      ...req,
      urgencia: desc.urgencia,
      justificativa: desc.justificativa,
      observacaoRevisao: desc.observacaoRevisao,
      statusVirtual,
      approvedDate: req.approvedDate?.toISOString() ?? null,
      items: normalizeItems(req.items, itemDecisions, desc.originalItens),
      originalItens: desc.originalItens,
      reviewData: desc.reviewData
        ? {
            decision: desc.reviewData.decision,
            notes: desc.reviewData.notes,
            reviewedAt: desc.reviewData.reviewedAt,
            reviewedBy: desc.reviewData.reviewedBy,
            isParcial: desc.reviewData._parcial ?? false,
          }
        : null,
    };
  }

  async review(id: string, dto: ReviewMaterialRequestDto, user: JwtPayload) {
    if (!user?.mantenedoraId || !user?.unitId) throw new ForbiddenException('Escopo inválido');
    if (!isCoordRole(user)) throw new ForbiddenException('Apenas COORDENADOR pode aprovar/rejeitar');

    const req = await this.prisma.materialRequest.findUnique({
      where: { id },
      include: { items: true },
    });
    if (!req) throw new NotFoundException('Solicitação não encontrada');
    if (req.mantenedoraId !== user.mantenedoraId || req.unitId !== user.unitId) {
      throw new ForbiddenException('Fora do escopo');
    }

    // Preserva dados originais do description (metadados: urgencia, justificativa)
    const desc = parseDescription(req.description ?? null);
    const originalData = desc.originalData;

    let status: RequestStatus;
    let reviewData: Record<string, unknown>;

    if (dto.decision === ReviewDecision.APPROVE_ITEMS && dto.items && dto.items.length > 0) {
      const itemDecisions = dto.items.map(i => ({
        itemId: i.itemId,
        approved: i.approved,
        qtyApproved: i.approved ? Math.max(0, i.qtyApproved) : 0,
        reason: i.reason ?? null,
      }));

      for (const d of itemDecisions) {
        const dbItem = req.items.find(it => it.id === d.itemId);
        if (dbItem && d.qtyApproved > dbItem.quantity) {
          throw new ForbiddenException(
            `Item ${d.itemId}: qtyApproved (${d.qtyApproved}) não pode exceder qty solicitada (${dbItem.quantity})`,
          );
        }
      }

      const allRejected = itemDecisions.every(d => d.qtyApproved === 0);
      const allApproved = itemDecisions.every(d => d.approved && d.qtyApproved > 0);
      const isParcial = !allRejected && !allApproved;

      status = allRejected ? RequestStatus.REJEITADO : RequestStatus.APROVADO;
      reviewData = {
        _review: true,
        _parcial: isParcial,
        decision: dto.decision,
        notes: dto.notes ?? dto.comment ?? null,
        items: itemDecisions,
        reviewedAt: new Date().toISOString(),
        reviewedBy: user.sub,
      };
    } else {
      status =
        dto.decision === ReviewDecision.APPROVED || dto.decision === ReviewDecision.ADJUSTED
          ? RequestStatus.APROVADO
          : RequestStatus.REJEITADO;

      reviewData = {
        _review: true,
        _parcial: false,
        decision: dto.decision,
        notes: dto.notes ?? dto.comment ?? null,
        itemsApproved: dto.itemsApproved ?? null,
        reviewedAt: new Date().toISOString(),
        reviewedBy: user.sub,
      };
    }

    if (originalData) reviewData._originalData = originalData;

    const updated = await this.prisma.materialRequest.update({
      where: { id },
      data: {
        status,
        approvedBy: user.sub,
        approvedDate: new Date(),
        description: JSON.stringify(reviewData),
      },
      include: {
        createdByUser: { select: { id: true, firstName: true, lastName: true, email: true } },
        classroom: { select: { id: true, name: true } },
        items: { include: { material: { select: { id: true, name: true, unit: true } } } },
      },
    });

    const updatedDesc = parseDescription(updated.description ?? null);
    type ItemDecision = { itemId: string; approved: boolean; qtyApproved: number; reason?: string | null };
    const decisions: ItemDecision[] = Array.isArray(updatedDesc.reviewData?.items)
      ? (updatedDesc.reviewData!.items as ItemDecision[])
      : [];

    return {
      ...updated,
      urgencia: updatedDesc.urgencia,
      justificativa: updatedDesc.justificativa,
      observacaoRevisao: updatedDesc.observacaoRevisao,
      statusVirtual: updatedDesc.reviewData?._parcial ? 'PARCIAL' : updated.status,
      approvedDate: updated.approvedDate?.toISOString() ?? null,
      items: normalizeItems(updated.items, decisions, updatedDesc.originalItens),
      reviewData: updatedDesc.reviewData
        ? {
            decision: updatedDesc.reviewData.decision,
            notes: updatedDesc.reviewData.notes,
            reviewedAt: updatedDesc.reviewData.reviewedAt,
            reviewedBy: updatedDesc.reviewData.reviewedBy,
            isParcial: updatedDesc.reviewData._parcial ?? false,
          }
        : null,
    };
  }

  async relatorioConsumo(
    user: JwtPayload,
    params: { classroomId?: string; dataInicio?: string; dataFim?: string; unitId?: string },
  ) {
    if (!user?.mantenedoraId) throw new ForbiddenException('Escopo inválido');

    const where: Record<string, unknown> = { mantenedoraId: user.mantenedoraId };

    if (isCentralRole(user)) {
      if (params.unitId) where.unitId = params.unitId;
    } else {
      if (!user.unitId) throw new ForbiddenException('Escopo inválido');
      if (!isCoordRole(user)) throw new ForbiddenException('Apenas COORDENADOR pode acessar o relatório');
      where.unitId = user.unitId;
    }

    if (params.classroomId) where.classroomId = params.classroomId;
    if (params.dataInicio || params.dataFim) {
      const dateFilter: Record<string, Date> = {};
      if (params.dataInicio) dateFilter.gte = new Date(params.dataInicio);
      if (params.dataFim) dateFilter.lte = new Date(params.dataFim);
      where.requestedDate = dateFilter;
    }

    const requisicoes = await this.prisma.materialRequest.findMany({
      where: where as any,
      include: {
        classroom: { select: { name: true } },
        createdByUser: { select: { firstName: true, lastName: true, email: true } },
        unit: { select: { id: true, name: true } },
      },
      orderBy: { requestedDate: 'desc' },
    });

    const porCategoria: Record<string, { total: number; aprovados: number; pendentes: number; rejeitados: number }> = {};
    const porTurmaMap: Record<string, { nome: string; total: number; aprovados: number }> = {};
    const porUnidadeMap: Record<string, { nome: string; total: number; aprovados: number; pendentes: number }> = {};
    const porStatus: Record<string, number> = {};
    let custoEstimadoTotal = 0;

    for (const r of requisicoes) {
      if (!porCategoria[r.type]) porCategoria[r.type] = { total: 0, aprovados: 0, pendentes: 0, rejeitados: 0 };
      porCategoria[r.type].total++;
      if (r.status === 'APROVADO' || r.status === 'ENTREGUE') porCategoria[r.type].aprovados++;
      else if (r.status === 'REJEITADO') porCategoria[r.type].rejeitados++;
      else porCategoria[r.type].pendentes++;

      if (r.classroomId && r.classroom) {
        if (!porTurmaMap[r.classroomId]) porTurmaMap[r.classroomId] = { nome: r.classroom.name, total: 0, aprovados: 0 };
        porTurmaMap[r.classroomId].total++;
        if (r.status === 'APROVADO' || r.status === 'ENTREGUE') porTurmaMap[r.classroomId].aprovados++;
      }

      if (r.unitId && r.unit) {
        if (!porUnidadeMap[r.unitId]) porUnidadeMap[r.unitId] = { nome: r.unit.name, total: 0, aprovados: 0, pendentes: 0 };
        porUnidadeMap[r.unitId].total++;
        if (r.status === 'APROVADO' || r.status === 'ENTREGUE') porUnidadeMap[r.unitId].aprovados++;
        else if (r.status === 'SOLICITADO' || r.status === 'RASCUNHO') porUnidadeMap[r.unitId].pendentes++;
      }

      porStatus[r.status] = (porStatus[r.status] || 0) + 1;
      if (r.estimatedCost) custoEstimadoTotal += r.estimatedCost;
    }

    return {
      periodo: { inicio: params.dataInicio || null, fim: params.dataFim || null },
      escopo: params.unitId ? 'unidade' : (isCentralRole(user) ? 'rede' : 'unidade'),
      totais: {
        requisicoes: requisicoes.length,
        aprovadas: porStatus['APROVADO'] || 0,
        pendentes: (porStatus['SOLICITADO'] || 0) + (porStatus['EM_ANALISE'] || 0),
        rejeitadas: porStatus['REJEITADO'] || 0,
        entregues: porStatus['ENTREGUE'] || 0,
        custoEstimadoTotal: Math.round(custoEstimadoTotal * 100) / 100,
      },
      porCategoria,
      porTurma: Object.values(porTurmaMap),
      porUnidade: Object.values(porUnidadeMap),
      porStatus,
      detalhes: requisicoes.map(r => ({
        id: r.id,
        code: r.code,
        titulo: r.title,
        tipo: r.type,
        quantidade: r.quantity,
        status: r.status,
        prioridade: r.priority,
        turma: r.classroom?.name || null,
        unidade: r.unit?.name || null,
        professor: r.createdByUser
          ? `${r.createdByUser.firstName} ${r.createdByUser.lastName}`.trim()
          : null,
        custoEstimado: r.estimatedCost,
        dataSolicitacao: r.requestedDate,
        dataAprovacao: r.approvedDate,
      })),
    };
  }
}
