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

/** Apenas PROFESSOR (ou DEVELOPER para testes) pode criar requisições. UNIDADE não. */
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

/** STAFF_CENTRAL, MANTENEDORA ou DEVELOPER — acesso à rede inteira */
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

@Injectable()
export class MaterialRequestService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateMaterialRequestDto, user: JwtPayload) {
    if (!user?.mantenedoraId) throw new ForbiddenException('Escopo inválido');
    if (!isProfessorRole(user)) throw new ForbiddenException('Apenas PROFESSOR pode solicitar');

    // FIX 1: Resolver unitId quando não está no JWT do professor.
    // Prioridade: (1) JWT, (2) turma enviada no DTO, (3) primeira turma ativa do professor.
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
      if (!resolvedUnitId) throw new ForbiddenException('Professor sem unidade vinculada. Contate a coordenação.');
    }

    const code = `MR-${Date.now()}`;
    const isNewFormat = !!(dto.titulo || dto.itens || dto.categoria);
    const title = dto.titulo || dto.item || 'Requisição de Material';
    const type = mapType(dto.categoria || dto.type);
    const quantity = dto.itens?.[0]?.quantidade ?? dto.quantity ?? 1;

    let description: string | undefined;
    if (isNewFormat && dto.itens && dto.itens.length > 0) {
      description = JSON.stringify({
        itens: dto.itens,
        justificativa: dto.justificativa,
        urgencia: dto.urgencia,
        descricao: dto.descricao,
      });
    } else if (dto.childId) {
      description = `childId=${dto.childId}`;
    }

    const priorityMap: Record<string, string> = { BAIXA: 'baixa', MEDIA: 'normal', ALTA: 'alta' };
    const priority = dto.urgencia ? (priorityMap[dto.urgencia] ?? 'normal') : 'normal';

    return this.prisma.materialRequest.create({
      data: {
        mantenedoraId: user.mantenedoraId,
        unitId: resolvedUnitId,
        classroomId: dto.classroomId ?? null,
        code,
        title,
        description,
        type,
        quantity,
        priority,
        status: RequestStatus.SOLICITADO,
        createdBy: user.sub,
      },
    });
  }

  async listMine(user: JwtPayload) {
    // FIX P0.1: unitId pode ser null para professores sem unidade explícita no JWT.
    // Filtramos por mantenedoraId + createdBy; se unitId existir, adicionamos ao filtro.
    if (!user?.mantenedoraId) throw new ForbiddenException('Escopo inválido');
    const where: Record<string, unknown> = {
      mantenedoraId: user.mantenedoraId,
      createdBy: user.sub,
    };
    if (user.unitId) where.unitId = user.unitId;
    const result = await this.prisma.materialRequest.findMany({
      where: where as any,
      include: {
        createdByUser: { select: { id: true, firstName: true, lastName: true, email: true } },
        classroom: { select: { id: true, name: true } },
        items: true,
      },
      orderBy: { requestedDate: 'desc' },
      take: 100,
    });
    // FIX C2.1: parsear description para expor urgencia, observacaoRevisao e approvedDate
    return result.map(r => {
      let urgencia: string | null = null;
      let observacaoRevisao: string | null = null;
      if (r.description) {
        try {
          const parsed = JSON.parse(r.description) as Record<string, unknown>;
          if (parsed._review) {
            // reviewData: notas da revisão
            observacaoRevisao = typeof parsed.notes === 'string' ? parsed.notes : null;
          } else {
            // originalData: dados do pedido original
            urgencia = typeof parsed.urgencia === 'string' ? parsed.urgencia : null;
          }
        } catch { /* ignora */ }
      }
      return {
        ...r,
        urgencia,
        observacaoRevisao,
        approvedDate: r.approvedDate?.toISOString() ?? null,
        items: r.items.map(i => ({ ...i, materialName: i.productName })),
      };
    });
  }

  async list(
    user: JwtPayload,
    filters?: { status?: string; classroomId?: string; type?: string },
  ) {
    if (!user?.mantenedoraId) throw new ForbiddenException('Escopo inválido');
    // Filtros condicionais
    const extra: Record<string, unknown> = {};
    if (filters?.status) extra.status = filters.status;
    if (filters?.classroomId) extra.classroomId = filters.classroomId;
    if (filters?.type) extra.type = filters.type;
    // STAFF_CENTRAL/MANTENEDORA/DEVELOPER: lista toda a rede
    const addMaterialName = (items: Array<Record<string, unknown>>) =>
      items.map(i => ({ ...i, materialName: i.productName }));
    // FIX C2.2: parsear description para expor urgencia, statusVirtual e observacaoRevisao na listagem
    const parseDescription = (r: Record<string, unknown>) => {
      let urgencia: string | null = null;
      let observacaoRevisao: string | null = null;
      let statusVirtual: string | null = null;
      const desc = r.description as string | null;
      if (desc) {
        try {
          const parsed = JSON.parse(desc) as Record<string, unknown>;
          if (parsed._review) {
            observacaoRevisao = typeof parsed.notes === 'string' ? parsed.notes : null;
            statusVirtual = parsed._parcial ? 'PARCIAL' : null;
          } else {
            urgencia = typeof parsed.urgencia === 'string' ? parsed.urgencia : null;
          }
        } catch { /* ignora */ }
      }
      return { urgencia, observacaoRevisao, statusVirtual };
    };
    const mapItems = (rows: Array<{ items: Array<Record<string, unknown>> } & Record<string, unknown>>) =>
      rows.map(r => ({ ...r, ...parseDescription(r), items: addMaterialName(r.items) }));

    if (isCentralRole(user)) {
      const rows = await this.prisma.materialRequest.findMany({
        where: { mantenedoraId: user.mantenedoraId, ...extra } as any,
        include: {
          createdByUser: { select: { id: true, firstName: true, lastName: true, email: true } },
          classroom: { select: { id: true, name: true } },
          items: true,
        },
        orderBy: { requestedDate: 'desc' },
        take: 500,
      });
      // FIX P0.2c: alias materialName
      return mapItems(rows as any);
    }
    // UNIDADE: apenas sua unidade
    if (!user?.unitId) throw new ForbiddenException('Escopo inválido');
    if (!isCoordRole(user)) throw new ForbiddenException('Apenas COORDENADOR pode listar todas as requisições');
    const rows = await this.prisma.materialRequest.findMany({
      where: { mantenedoraId: user.mantenedoraId, unitId: user.unitId, ...extra } as any,
      include: {
        createdByUser: { select: { id: true, firstName: true, lastName: true, email: true } },
        classroom: { select: { id: true, name: true } },
        items: true,
      },
      orderBy: { requestedDate: 'desc' },
      take: 200,
    });
    // FIX P0.2c: alias materialName
    return mapItems(rows as any);
  }

  /**
   * Busca uma requisição pelo ID com todos os detalhes.
   * Faz merge do reviewData (campo description) nos itens, retornando qtyApproved e approved por item.
   * UNIDADE: apenas requisições da própria unidade.
   */
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

    // Tenta parsear reviewData do campo description
    let reviewData: Record<string, unknown> | null = null;
    let originalData: Record<string, unknown> | null = null;
    if (req.description) {
      try {
        const parsed = JSON.parse(req.description) as Record<string, unknown>;
        if (parsed._review) {
          reviewData = parsed;
          // Se havia dados originais preservados, recupera
          if (parsed._originalData) originalData = parsed._originalData as Record<string, unknown>;
        } else {
          originalData = parsed;
        }
      } catch { /* ignora */ }
    }

    // Merge qtyApproved/approved nos itens do banco
    type ItemDecision = { itemId: string; approved: boolean; qtyApproved: number; reason?: string | null };
    const itemDecisions: ItemDecision[] = Array.isArray(reviewData?.items)
      ? (reviewData.items as ItemDecision[])
      : [];

    const itemsWithApproval = req.items.map(item => {
      const decision = itemDecisions.find(d => d.itemId === item.id);
      return {
        ...item,
        // FIX P0.2c: frontend espera materialName, schema Prisma usa productName
        materialName: item.productName,
        qtyApproved: decision ? decision.qtyApproved : null,
        approved: decision ? decision.approved : null,
        approvalReason: decision?.reason ?? null,
      };
    });

    // Status virtual: se _parcial=true, expor como PARCIAL no response
    const statusVirtual = reviewData?._parcial ? 'PARCIAL' : req.status;

    return {
      ...req,
      items: itemsWithApproval,
      statusVirtual,
      reviewData: reviewData
        ? {
            decision: reviewData.decision,
            notes: reviewData.notes,
            reviewedAt: reviewData.reviewedAt,
            reviewedBy: reviewData.reviewedBy,
            isParcial: reviewData._parcial ?? false,
          }
        : null,
      // Expor dados originais (itens do description) se existirem
      originalItens: originalData?.itens ?? null,
      justificativa: originalData?.justificativa ?? null,
      urgencia: originalData?.urgencia ?? null,
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

    // Recupera dados originais (itens do description) para preservar
    let originalData: Record<string, unknown> | null = null;
    if (req.description) {
      try {
        const parsed = JSON.parse(req.description) as Record<string, unknown>;
        if (!parsed._review) originalData = parsed;
      } catch { /* ignora */ }
    }

    let status: RequestStatus;
    let reviewData: Record<string, unknown>;

    if (dto.decision === ReviewDecision.APPROVE_ITEMS && dto.items && dto.items.length > 0) {
      // ── Aprovação item-a-item ────────────────────────────────────────────
      const itemDecisions = dto.items.map(i => ({
        itemId: i.itemId,
        approved: i.approved,
        qtyApproved: i.approved ? Math.max(0, i.qtyApproved) : 0,
        reason: i.reason ?? null,
      }));

      // Valida qty contra qty solicitada
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
      // ── Decisão global (legado) ────────────────────────────────────────────
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

    // Preserva dados originais no reviewData
    if (originalData) reviewData._originalData = originalData;

    return this.prisma.materialRequest.update({
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
  }

  /**
   * Relatório de consumo de materiais por turma e período
   * Suporte multiunidade: STAFF_CENTRAL/MANTENEDORA/DEVELOPER podem passar unitId (ou null = rede inteira)
   * UNIDADE: sempre usa token.unitId
   */
  async relatorioConsumo(
    user: JwtPayload,
    params: { classroomId?: string; dataInicio?: string; dataFim?: string; unitId?: string },
  ) {
    if (!user?.mantenedoraId) throw new ForbiddenException('Escopo inválido');

    const where: Record<string, unknown> = {
      mantenedoraId: user.mantenedoraId,
    };

    // Escopo de unidade: CENTRAL pode filtrar por unitId ou ver rede inteira
    if (isCentralRole(user)) {
      if (params.unitId) {
        where.unitId = params.unitId;
      }
      // se unitId não enviado: sem filtro de unitId → rede inteira
    } else {
      // UNIDADE: força token.unitId, ignora unitId do client
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

      // Agrupamento por unidade (útil para modo rede)
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
