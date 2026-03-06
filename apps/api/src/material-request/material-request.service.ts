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
    if (!user?.mantenedoraId || !user?.unitId) throw new ForbiddenException('Escopo inválido');
    if (!isProfessorRole(user)) throw new ForbiddenException('Apenas PROFESSOR pode solicitar');

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
        unitId: user.unitId,
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
    if (!user?.mantenedoraId || !user?.unitId) throw new ForbiddenException('Escopo inválido');
    return this.prisma.materialRequest.findMany({
      where: {
        mantenedoraId: user.mantenedoraId,
        unitId: user.unitId,
        createdBy: user.sub,
      },
      include: {
        createdByUser: { select: { id: true, firstName: true, lastName: true, email: true } },
        classroom: { select: { id: true, name: true } },
        items: true,
      },
      orderBy: { requestedDate: 'desc' },
      take: 100,
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
    if (isCentralRole(user)) {
      return this.prisma.materialRequest.findMany({
        where: { mantenedoraId: user.mantenedoraId, ...extra } as any,
        include: {
          createdByUser: { select: { id: true, firstName: true, lastName: true, email: true } },
          classroom: { select: { id: true, name: true } },
          items: true,
        },
        orderBy: { requestedDate: 'desc' },
        take: 500,
      });
    }
    // UNIDADE: apenas sua unidade
    if (!user?.unitId) throw new ForbiddenException('Escopo inválido');
    if (!isCoordRole(user)) throw new ForbiddenException('Apenas COORDENADOR pode listar todas as requisições');
    return this.prisma.materialRequest.findMany({
      where: { mantenedoraId: user.mantenedoraId, unitId: user.unitId, ...extra } as any,
      include: {
        createdByUser: { select: { id: true, firstName: true, lastName: true, email: true } },
        classroom: { select: { id: true, name: true } },
        items: true,
      },
      orderBy: { requestedDate: 'desc' },
      take: 200,
    });
  }

  async review(id: string, dto: ReviewMaterialRequestDto, user: JwtPayload) {
    if (!user?.mantenedoraId || !user?.unitId) throw new ForbiddenException('Escopo inválido');
    if (!isCoordRole(user)) throw new ForbiddenException('Apenas COORDENADOR pode aprovar/rejeitar');

    const req = await this.prisma.materialRequest.findUnique({ where: { id } });
    if (!req) throw new NotFoundException('Solicitação não encontrada');
    if (req.mantenedoraId !== user.mantenedoraId || req.unitId !== user.unitId) {
      throw new ForbiddenException('Fora do escopo');
    }

    let status: RequestStatus;
    if (dto.decision === ReviewDecision.APPROVED || dto.decision === ReviewDecision.ADJUSTED) {
      status = RequestStatus.APROVADO;
    } else {
      status = RequestStatus.REJEITADO;
    }

    // Persiste notas de revisão (notes + itemsApproved) sem alterar schema
    // Armazena como JSON no campo description apenas se houver informação de revisão
    const reviewMeta =
      dto.notes || dto.itemsApproved?.length
        ? JSON.stringify({
            _review: true,
            decision: dto.decision,
            notes: dto.notes ?? null,
            itemsApproved: dto.itemsApproved ?? null,
          })
        : undefined;

    return this.prisma.materialRequest.update({
      where: { id },
      data: {
        status,
        approvedBy: user.sub,
        approvedDate: new Date(),
        ...(reviewMeta !== undefined ? { description: reviewMeta } : {}),
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
