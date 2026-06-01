import {
  Injectable,
  Logger,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { IaExecutorService } from '../executor/ia-executor.service';
import { PromptService } from '../prompt/prompt.service';

export type IaRequestType =
  | 'ATIVIDADE'
  | 'MICROGESTOS'
  | 'RELATORIO_ALUNO'
  | 'RELATORIO_TURMA'
  | 'ANALISE_PLANO'
  | 'ANALISE_DIARIO'
  | 'LEMBRETE'
  | 'VARREDURA'
  | 'TEXTO_PERSONALIZADO';

export interface SolicitarIaDto {
  /** ID do usuário que faz a solicitação */
  requesterId: string;
  mantenedoraId: string;
  unitId: string;
  type: IaRequestType;
  /** Dados de entrada já anonimizados */
  payload: Record<string, unknown>;
  /** Prompt final a ser enviado à IA (já interpolado) */
  prompt: string;
  /** Instrução de sistema opcional */
  systemInstruction?: string;
  /** ID do PromptTemplate usado (para rastreabilidade) */
  promptId?: string;
}

@Injectable()
export class IaOrchestratorService {
  private readonly logger = new Logger(IaOrchestratorService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly executor: IaExecutorService,
    private readonly promptService: PromptService,
  ) {}

  /**
   * Ponto de entrada central para todas as requisições de IA.
   *
   * Fluxo:
   * 1. Valida os dados de entrada
   * 2. Cria o registro IaRequest com status PENDENTE
   * 3. Registra o log "queued"
   * 4. Executa sincronamente via IaExecutor (sem fila por ora — Fase 1)
   * 5. Retorna o requestId e o resultado (se disponível)
   */
  async solicitar(dto: SolicitarIaDto): Promise<{
    requestId: string;
    status: string;
    result?: Record<string, unknown>;
  }> {
    this.validateDto(dto);

    // 1. Criar IaRequest
    const request = await this.prisma.iaRequest.create({
      data: {
        mantenedoraId: dto.mantenedoraId,
        unitId: dto.unitId,
        requesterId: dto.requesterId,
        type: dto.type,
        status: 'PENDENTE',
        payload: dto.payload as Prisma.InputJsonValue,
        promptId: dto.promptId ?? null,
      },
    });

    this.logger.log(
      `IaRequest criada: ${request.id} | tipo: ${dto.type} | requester: ${dto.requesterId}`,
    );

    // 2. Registrar log "queued"
    await this.prisma.iaLog.create({
      data: {
        requestId: request.id,
        event: 'queued',
        message: `Requisição do tipo ${dto.type} enfileirada.`,
      },
    });

    // 3. Executar sincronamente (Fase 1 — sem BullMQ ainda)
    await this.executor.execute({
      requestId: request.id,
      prompt: dto.prompt,
      systemInstruction: dto.systemInstruction,
      promptId: dto.promptId,
    });

    // 4. Buscar resultado
    const response = await this.prisma.iaResponse.findUnique({
      where: { requestId: request.id },
    });

    const updatedRequest = await this.prisma.iaRequest.findUnique({
      where: { id: request.id },
      select: { status: true },
    });

    return {
      requestId: request.id,
      status: updatedRequest?.status ?? 'DESCONHECIDO',
      result: response?.result as Record<string, unknown> | undefined,
    };
  }

  /**
   * Busca uma requisição por ID com sua resposta e logs.
   */
  async findOne(requestId: string) {
    const request = await this.prisma.iaRequest.findUnique({
      where: { id: requestId },
      include: {
        response: true,
        logs: { orderBy: { createdAt: 'asc' } },
      },
    });
    if (!request) {
      throw new NotFoundException(`IaRequest "${requestId}" não encontrada.`);
    }
    return request;
  }

  /**
   * Lista requisições com filtros.
   */
  async findAll(filters: {
    mantenedoraId?: string;
    unitId?: string;
    requesterId?: string;
    type?: IaRequestType;
    status?: string;
    page?: number;
    limit?: number;
  }) {
    const page = filters.page ?? 1;
    const limit = Math.min(filters.limit ?? 20, 100);
    const skip = (page - 1) * limit;

    const where = {
      ...(filters.mantenedoraId && { mantenedoraId: filters.mantenedoraId }),
      ...(filters.unitId && { unitId: filters.unitId }),
      ...(filters.requesterId && { requesterId: filters.requesterId }),
      ...(filters.type && { type: filters.type }),
      ...(filters.status && { status: filters.status as any }),
    };

    const [items, total] = await Promise.all([
      this.prisma.iaRequest.findMany({
        where,
        include: { response: { select: { id: true, status: true, totalCost: true } } },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.iaRequest.count({ where }),
    ]);

    return { items, total, page, limit };
  }

  /**
   * Registra feedback do usuário sobre uma resposta.
   */
  async registrarFeedback(params: {
    responseId: string;
    userId: string;
    rating: number;
    comment?: string;
  }) {
    if (params.rating < 1 || params.rating > 5) {
      throw new BadRequestException('O rating deve ser entre 1 e 5.');
    }

    const response = await this.prisma.iaResponse.findUnique({
      where: { id: params.responseId },
    });
    if (!response) {
      throw new NotFoundException(`IaResponse "${params.responseId}" não encontrada.`);
    }

    return this.prisma.iaFeedback.create({
      data: {
        responseId: params.responseId,
        userId: params.userId,
        rating: params.rating,
        comment: params.comment,
      },
    });
  }

  /**
   * Aprova ou rejeita uma resposta de IA (revisão humana obrigatória).
   */
  async revisarResposta(params: {
    responseId: string;
    reviewedBy: string;
    approved: boolean;
  }) {
    const response = await this.prisma.iaResponse.findUnique({
      where: { id: params.responseId },
    });
    if (!response) {
      throw new NotFoundException(`IaResponse "${params.responseId}" não encontrada.`);
    }

    return this.prisma.iaResponse.update({
      where: { id: params.responseId },
      data: {
        approved: params.approved,
        reviewedBy: params.reviewedBy,
        status: params.approved ? 'APROVADO' : 'REJEITADO',
      },
    });
  }

  private validateDto(dto: SolicitarIaDto): void {
    if (!dto.requesterId) throw new BadRequestException('requesterId é obrigatório.');
    if (!dto.mantenedoraId) throw new BadRequestException('mantenedoraId é obrigatório.');
    if (!dto.unitId) throw new BadRequestException('unitId é obrigatório.');
    if (!dto.type) throw new BadRequestException('type é obrigatório.');
    if (!dto.prompt?.trim()) throw new BadRequestException('prompt é obrigatório.');
  }
}
