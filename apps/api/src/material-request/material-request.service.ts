import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateMaterialRequestDto, MaterialRequestTypeInput } from './dto/create-material-request.dto';
import { ReviewDecision, ReviewMaterialRequestDto } from './dto/review-material-request.dto';
import { MaterialRequestType, RequestStatus, RoleLevel } from '@prisma/client';
import type { JwtPayload } from '../auth/interfaces/jwt-payload.interface';
import { Prisma } from '@prisma/client';
import { randomUUID } from 'crypto';

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
    user.roles.some((r: any) =>
      r?.level === RoleLevel.PROFESSOR ||
      r?.level === RoleLevel.DEVELOPER ||
      r?.type === 'PROFESSOR_AUXILIAR'
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
 * Shape do item retornado pela query raw da tabela legada material_request_item.
 * Campos confirmados no banco real de produção (migration 20260223 + 20260307).
 */
interface RawMaterialRequestItem {
  id: string;
  request_id: string | null;
  material_id: string | null;
  quantity: number | null;
  unit_price: unknown;
  total_price: unknown;
  observations: string | null;
  item: string | null;
  quantidade: number | null;
  unidade: string | null;
}

/**
 * Busca os itens da tabela legada material_request_item pelo requestId.
 * Usa $queryRaw para contornar incompatibilidade entre o Prisma Client
 * (gerado com o schema novo que usa productName/materialRequestId)
 * e o banco real de produção (que tem item/quantidade/unidade/request_id).
 *
 * Fallback: se a tabela legada não existir, tenta a tabela nova MaterialRequestItem.
 */
async function fetchItemsRaw(
  prisma: PrismaService,
  requestId: string,
): Promise<RawMaterialRequestItem[]> {
  try {
    const rows = await prisma.$queryRaw<RawMaterialRequestItem[]>(
      Prisma.sql`
        SELECT id,
               request_id,
               material_id,
               quantity,
               unit_price,
               total_price,
               observations,
               item,
               quantidade,
               unidade
        FROM material_request_item
        WHERE request_id = ${requestId}
        ORDER BY id
      `,
    );
    return rows;
  } catch {
    // Fallback: banco novo com tabela MaterialRequestItem (PascalCase, schema 20260307)
    try {
      const rows2 = await prisma.$queryRaw<RawMaterialRequestItem[]>(
        Prisma.sql`
          SELECT id,
                 "materialRequestId" AS request_id,
                 "materialId"        AS material_id,
                 quantity,
                 "unitPrice"         AS unit_price,
                 NULL::numeric       AS total_price,
                 observations,
                 "productName"       AS item,
                 quantity            AS quantidade,
                 unit                AS unidade
          FROM "MaterialRequestItem"
          WHERE "materialRequestId" = ${requestId}
          ORDER BY id
        `,
      );
      return rows2;
    } catch {
      return [];
    }
  }
}

/**
 * Normaliza os itens raw para o formato unificado de resposta.
 * Prioridade: itens do banco > itens legados (description.itens)
 */
function normalizeRawItems(
  rawItems: RawMaterialRequestItem[],
  reviewDecisions: Array<{ itemId: string; approved: boolean; qtyApproved: number; reason?: string | null }>,
  legacyItens: { item: string; quantidade: number; unidade?: string }[] | null,
) {
  if (rawItems.length > 0) {
    return rawItems.map(it => {
      const nome = it.item ?? '';
      const qty = Number(it.quantidade ?? it.quantity ?? 1);
      const decision = reviewDecisions.find(d => d.itemId === it.id);
      return {
        id: it.id,
        materialId: it.material_id ?? null,
        productName: nome,
        materialName: nome,
        quantity: qty,
        unit: it.unidade ?? null,
        observations: it.observations ?? null,
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
    const itensParaPersistir: Array<{ item: string; quantidade: number; unidade?: string }> = [];
    if (dto.itens && dto.itens.length > 0) {
      for (const it of dto.itens) {
        if (it.item?.trim()) {
          itensParaPersistir.push({
            item: it.item.trim(),
            quantidade: it.quantidade ?? 1,
            unidade: it.unidade,
          });
        }
      }
    } else if (dto.item) {
      itensParaPersistir.push({
        item: dto.item.trim(),
        quantidade: dto.quantity ?? 1,
      });
    }

    // quantity total = soma dos itens (ou 1 se não houver itens)
    const totalQuantity = itensParaPersistir.reduce((acc, it) => acc + it.quantidade, 0) || 1;

    // description: armazena metadados (justificativa, urgencia) + itens como fallback
    // Os itens são armazenados aqui para garantir exibição mesmo se o INSERT na tabela
    // material_request_item falhar (banco com estrutura diferente do esperado).
    const descriptionData: Record<string, unknown> = {};
    if (dto.justificativa) descriptionData.justificativa = dto.justificativa;
    if (dto.urgencia) descriptionData.urgencia = dto.urgencia;
    if (dto.descricao) descriptionData.descricao = dto.descricao;
    if (itensParaPersistir.length > 0) {
      descriptionData.itens = itensParaPersistir.map(it => ({
        item: it.item,
        quantidade: it.quantidade,
        unidade: it.unidade ?? null,
      }));
    }
    const description = Object.keys(descriptionData).length > 0
      ? JSON.stringify(descriptionData)
      : undefined;

    // Criar a requisição (sem items via Prisma para evitar P2022 com productName)
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
      },
      include: {
        classroom: { select: { id: true, name: true } },
        createdByUser: { select: { id: true, firstName: true, lastName: true, email: true } },
        unit: { select: { id: true, name: true } },
      },
    });

    // Inserir itens diretamente na tabela legada material_request_item
    // NOTA: A tabela material_request_item tem colunas createdAt/updatedAt (camelCase),
    // conforme confirmado no comentário da migration 20260223 (tabela pré-existente).
    if (itensParaPersistir.length > 0) {
      for (const it of itensParaPersistir) {
        const itemId = randomUUID();
        let insertedLegacy = false;
        // Tentativa 1: tabela legada com createdAt/updatedAt (camelCase)
        try {
          await this.prisma.$executeRaw(
            Prisma.sql`
              INSERT INTO material_request_item
                (id, request_id, item, quantidade, unidade, quantity, "createdAt", "updatedAt")
              VALUES (
                ${itemId},
                ${created.id},
                ${it.item},
                ${it.quantidade},
                ${it.unidade ?? null},
                ${it.quantidade},
                NOW(),
                NOW()
              )
            `,
          );
          insertedLegacy = true;
        } catch {
          // Tentativa 2: tabela legada com created_at/updated_at (snake_case)
          try {
            await this.prisma.$executeRaw(
              Prisma.sql`
                INSERT INTO material_request_item
                  (id, request_id, item, quantidade, unidade, quantity, created_at, updated_at)
                VALUES (
                  ${itemId},
                  ${created.id},
                  ${it.item},
                  ${it.quantidade},
                  ${it.unidade ?? null},
                  ${it.quantidade},
                  NOW(),
                  NOW()
                )
              `,
            );
            insertedLegacy = true;
          } catch { /* segue para fallback */ }
        }
        // Fallback: tabela nova MaterialRequestItem (banco sem tabela legada)
        if (!insertedLegacy) {
          try {
            await this.prisma.$executeRaw(
              Prisma.sql`
                INSERT INTO "MaterialRequestItem"
                  (id, "materialRequestId", "productName", quantity, unit, "createdAt", "updatedAt")
                VALUES (
                  ${itemId},
                  ${created.id},
                  ${it.item},
                  ${it.quantidade},
                  ${it.unidade ?? null},
                  NOW(),
                  NOW()
                )
              `,
            );
          } catch {
            // Silencia: item não inserido, mas a requisição já foi criada com sucesso.
            // Os itens ficam no campo description.itens como fallback de exibição.
          }
        }
      }
    }

    const rawItems = await fetchItemsRaw(this.prisma, created.id);
    const desc = parseDescription(created.description ?? null);
    return {
      ...created,
      urgencia: desc.urgencia,
      justificativa: desc.justificativa,
      observacaoRevisao: null,
      statusVirtual: created.status as string,
      approvedDate: created.approvedDate?.toISOString() ?? null,
      items: normalizeRawItems(rawItems, [], desc.originalItens),
      originalItens: desc.originalItens,
    };
  }

  async listMine(user: JwtPayload) {
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
        unit: { select: { id: true, name: true } },
        classroom: { select: { id: true, name: true } },
      },
      orderBy: { requestedDate: 'desc' },
      take: 100,
    });
    // Buscar itens de cada requisição via raw query (compatível com banco legado)
    const rows = await Promise.all(
      result.map(async r => {
        const rawItems = await fetchItemsRaw(this.prisma, r.id);
        const desc = parseDescription(r.description ?? null);
        return {
          ...r,
          urgencia: desc.urgencia,
          justificativa: desc.justificativa,
          observacaoRevisao: desc.observacaoRevisao,
          statusVirtual: desc.statusVirtual,
          approvedDate: r.approvedDate?.toISOString() ?? null,
          items: normalizeRawItems(rawItems, [], desc.originalItens),
          originalItens: desc.originalItens,
        };
      }),
    );
    return rows;
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
      unit: { select: { id: true, name: true } },
      classroom: { select: { id: true, name: true } },
    };

    const mapRows = async (rows: any[]) =>
      Promise.all(
        rows.map(async r => {
          const rawItems = await fetchItemsRaw(this.prisma, r.id);
          const desc = parseDescription(r.description ?? null);
          return {
            ...r,
            urgencia: desc.urgencia,
            justificativa: desc.justificativa,
            observacaoRevisao: desc.observacaoRevisao,
            statusVirtual: desc.statusVirtual,
            approvedDate: r.approvedDate?.toISOString() ?? null,
            items: normalizeRawItems(rawItems, [], desc.originalItens),
            originalItens: desc.originalItens,
          };
        }),
      );

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
        unit: { select: { id: true, name: true } },
        classroom: { select: { id: true, name: true } },
      },
    });
    if (!req) throw new NotFoundException('Requisição não encontrada');
    if (req.mantenedoraId !== user.mantenedoraId) throw new ForbiddenException('Fora do escopo');
    if (!isCentralRole(user) && user.unitId && req.unitId !== user.unitId) {
      throw new ForbiddenException('Requisição não pertence à sua unidade');
    }

    const desc = parseDescription(req.description ?? null);

    // Merge qtyApproved/approved nos itens do banco (vem do reviewData.items)
    type ItemDecision = { itemId: string; approved: boolean; qtyApproved: number; reason?: string | null };
    const itemDecisions: ItemDecision[] = Array.isArray(desc.reviewData?.items)
      ? (desc.reviewData!.items as ItemDecision[])
      : [];

    const statusVirtual = desc.reviewData?._parcial ? 'PARCIAL' : req.status;
    const rawItems = await fetchItemsRaw(this.prisma, id);

    return {
      ...req,
      urgencia: desc.urgencia,
      justificativa: desc.justificativa,
      observacaoRevisao: desc.observacaoRevisao,
      statusVirtual,
      approvedDate: req.approvedDate?.toISOString() ?? null,
      items: normalizeRawItems(rawItems, itemDecisions, desc.originalItens),
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
    if (!isCoordRole(user) && !isCentralRole(user)) throw new ForbiddenException('Apenas COORDENADOR/STAFF pode aprovar/rejeitar');

    const req = await this.prisma.materialRequest.findUnique({
      where: { id },
    });
    if (!req) throw new NotFoundException('Solicitação não encontrada');
    if (req.mantenedoraId !== user.mantenedoraId) {
      throw new ForbiddenException('Fora do escopo');
    }
    if (!isCentralRole(user) && user.unitId && req.unitId !== user.unitId) {
      throw new ForbiddenException('Requisição não pertence à sua unidade');
    }

    // Buscar itens via raw query para validação de qtyApproved
    const rawItems = await fetchItemsRaw(this.prisma, id);

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
        const dbItem = rawItems.find(it => it.id === d.itemId);
        if (dbItem) {
          const dbQty = Number(dbItem.quantidade ?? dbItem.quantity ?? 0);
          if (d.qtyApproved > dbQty) {
            throw new ForbiddenException(
              `Item ${d.itemId}: qtyApproved (${d.qtyApproved}) não pode exceder qty solicitada (${dbQty})`,
            );
          }
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
      // Para ADJUSTED: calcular se é parcial baseado em itemsApproved vs itens totais
      let isParcialAdjusted = false;
      if (dto.decision === ReviewDecision.ADJUSTED && dto.itemsApproved && dto.itemsApproved.length > 0) {

        const todosZero = dto.itemsApproved.every(i => i.quantidadeAprovada === 0);
        const algumZero = dto.itemsApproved.some(i => i.quantidadeAprovada === 0);
        const algumMenorQueOriginal = dto.itemsApproved.some(i => {
          const dbItem = rawItems.find(it => it.id === i.id);
          if (!dbItem) return false;
          const dbQty = Number(dbItem.quantidade ?? dbItem.quantity ?? 0);
          return i.quantidadeAprovada < dbQty;
        });
        if (todosZero) {
          // Todos zerados = rejeição total
        } else if (algumZero || algumMenorQueOriginal) {
          isParcialAdjusted = true;
        }
      }

      status =
        dto.decision === ReviewDecision.APPROVED || dto.decision === ReviewDecision.ADJUSTED
          ? RequestStatus.APROVADO
          : RequestStatus.REJEITADO;

      reviewData = {
        _review: true,
        _parcial: isParcialAdjusted,
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
        unit: { select: { id: true, name: true } },
        classroom: { select: { id: true, name: true } },
      },
    });

    const updatedDesc = parseDescription(updated.description ?? null);
    type ItemDecision = { itemId: string; approved: boolean; qtyApproved: number; reason?: string | null };
    const decisions: ItemDecision[] = Array.isArray(updatedDesc.reviewData?.items)
      ? (updatedDesc.reviewData!.items as ItemDecision[])
      : [];

    const updatedRawItems = await fetchItemsRaw(this.prisma, id);

    return {
      ...updated,
      urgencia: updatedDesc.urgencia,
      justificativa: updatedDesc.justificativa,
      observacaoRevisao: updatedDesc.observacaoRevisao,
      statusVirtual: updatedDesc.reviewData?._parcial ? 'PARCIAL' : updated.status,
      approvedDate: updated.approvedDate?.toISOString() ?? null,
      items: normalizeRawItems(updatedRawItems, decisions, updatedDesc.originalItens),
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
