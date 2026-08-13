import http from './http';

export type StatusPedidoCompra =
  | 'RASCUNHO'
  | 'ENVIADO'
  | 'EM_ANALISE'
  | 'APROVADO'
  | 'COMPRADO'
  | 'EM_ENTREGA'
  | 'ENTREGUE'
  | 'CANCELADO';

export interface ItemPedidoCompra {
  id: string;
  categoria: string;
  descricao: string;
  quantidade: number;
  unidadeMedida?: string;
  custoEstimado?: number;
  /** Fornecedor (armazenado localmente, não persiste no backend sem schema change) */
  _fornecedor?: string;
}

export interface PedidoCompra {
  id: string;
  mesReferencia: string;
  status: StatusPedidoCompra;
  observacoes?: string;
  consolidadoPor?: string;
  criadoEm: string;
  atualizadoEm: string;
  enviadoEm?: string;
  entregueEm?: string;
  unit: { id: string; name: string };
  itens: ItemPedidoCompra[];
}

export interface ItemPedidoDto {
  categoria: string;
  descricao: string;
  quantidade: number;
  unidadeMedida?: string;
  /** Preço unitário (alias de custoEstimado — enviado como custoEstimado ao backend) */
  precoUnitario?: number;
  custoEstimado?: number;
  /** Fornecedor (campo local, não persiste no schema atual) */
  _fornecedor?: string;
}

export interface CriarPedidoDto {
  mesReferencia: string;
  unitId?: string;
  observacoes?: string;
  itens: ItemPedidoDto[];
}

export interface AtualizarItensPedidoDto {
  observacoes?: string;
  itens?: ItemPedidoDto[];
}

export interface ConsolidarPedidoDto {
  mesReferencia: string;
  unitId?: string;
  observacoes?: string;
}

export interface AtualizarStatusPedidoDto {
  status: StatusPedidoCompra;
  observacoes?: string;
}

/**
 * Cria um Pedido de Compra diretamente com itens (sem exigir requisições aprovadas).
 * Idempotente: se já existir RASCUNHO para unidade+mês, retorna o existente.
 */
export async function criarPedido(dto: CriarPedidoDto): Promise<PedidoCompra> {
  const response = await http.post('/material-requests', {
    titulo: `Pedido ${dto.mesReferencia}`,
    justificativa: dto.observacoes ?? '',
    urgencia: 'MEDIA',
    categoria: 'PEDAGOGICO',
    itens: dto.itens.map(i => ({
      item: i.descricao,
      quantidade: i.quantidade,
      unidade: i.unidadeMedida ?? 'un',
    })),
  });
  return response.data;
}

/**
 * Atualiza os itens de um pedido RASCUNHO (edição inline da planilha)
 */
export async function atualizarItensPedido(
  id: string,
  dto: AtualizarItensPedidoDto,
): Promise<PedidoCompra> {
  const response = await http.patch(`/pedidos-compra/${id}/itens`, dto);
  return response.data;
}

/**
 * Consolida requisições aprovadas do mês em um Pedido de Compra
 */
export async function consolidarPedido(dto: ConsolidarPedidoDto): Promise<{
  pedidoId: string;
  mesReferencia: string;
  status: StatusPedidoCompra;
  totalItens: number;
  totalRequisicoes: number;
  mensagem: string;
}> {
  const response = await http.post('/pedidos-compra/consolidar', dto);
  return response.data;
}

/**
 * Lista pedidos de compra com filtros opcionais
 */
export async function listarPedidosCompra(filtros?: {
  mesReferencia?: string;
  unitId?: string;
  status?: StatusPedidoCompra;
}): Promise<PedidoCompra[]> {
  try {
    const params: Record<string, string | undefined> = {};
    if (filtros?.status) params.status = filtros.status;
    if (filtros?.unitId) params.unitId = filtros.unitId;
    const response = await http.get('/material-requests', { params });
    const data = response.data;
    if (!Array.isArray(data)) return [];
    return data.map((r: any): PedidoCompra => ({
      id: r.id ?? '',
      mesReferencia: r.code ?? r.title ?? '',
      status: (r.status as StatusPedidoCompra) ?? 'RASCUNHO',
      observacoes: (() => {
        if (!r.description) return undefined;
        try {
          const parsed = JSON.parse(r.description);
          if (parsed._review && parsed._originalData?.justificativa) {
            return String(parsed._originalData.justificativa);
          }
          if (parsed._review && parsed.notes) {
            return String(parsed.notes);
          }
          if (parsed.justificativa) {
            return String(parsed.justificativa);
          }
          return undefined;
        } catch {
          return r.description.length < 200 ? r.description : undefined;
        }
      })(),
      criadoEm: r.requestedDate ?? r.createdAt ?? new Date().toISOString(),
      atualizadoEm: r.updatedAt ?? r.createdAt ?? new Date().toISOString(),
      unit: r.unit ?? { id: '', name: '' },
      itens: Array.isArray(r.items) && r.items.length > 0
        ? r.items.map((it: any): ItemPedidoCompra => ({
            id: it.id ?? '',
            categoria: r.type ?? 'OUTRO',
            descricao: it.productName ?? it.materialName ?? it.item ?? '',
            quantidade: Number(it.quantity ?? it.quantidade ?? 1),
            unidadeMedida: it.unit ?? it.unidade ?? undefined,
            custoEstimado: it.unitPrice ?? it.unit_price ?? undefined,
          }))
        : Array.isArray(r.originalItens) && r.originalItens.length > 0
        ? r.originalItens.map((it: any, idx: number): ItemPedidoCompra => ({
            id: `legacy-${idx}`,
            categoria: r.type ?? 'OUTRO',
            descricao: it.item ?? '',
            quantidade: Number(it.quantidade ?? 1),
            unidadeMedida: it.unidade ?? undefined,
            custoEstimado: undefined,
          }))
        : [],
    }));
  } catch {
    return [];
  }
}

/**
 * Busca um pedido pelo ID
 */
export async function buscarPedidoCompra(id: string): Promise<PedidoCompra> {
  const response = await http.get(`/pedidos-compra/${id}`);
  return response.data;
}

/**
 * Atualiza o status de um pedido
 */
export async function atualizarStatusPedido(
  id: string,
  dto: AtualizarStatusPedidoDto,
): Promise<PedidoCompra> {
  const response = await http.patch(`/pedidos-compra/${id}/status`, dto);
  return response.data;
}

/**
 * Mapeia status para label em português
 */
export function getStatusPedidoLabel(status: StatusPedidoCompra | string): string {
  const labels: Record<string, string> = {
    RASCUNHO: 'Rascunho',
    ENVIADO: 'Enviado',
    EM_ANALISE: 'Em Análise',
    APROVADO: 'Aprovado',
    COMPRADO: 'Comprado',
    EM_ENTREGA: 'Em Entrega',
    ENTREGUE: 'Entregue',
    CANCELADO: 'Cancelado',
  };
  return labels[status] || status;
}

/**
 * Mapeia status para cor de badge
 */
export function getStatusPedidoCor(status: StatusPedidoCompra | string): string {
  const cores: Record<string, string> = {
    RASCUNHO: 'bg-gray-100 text-gray-700',
    ENVIADO: 'bg-yellow-100 text-yellow-800',
    EM_ANALISE: 'bg-blue-100 text-blue-800',
    APROVADO: 'bg-green-100 text-green-800',
    COMPRADO: 'bg-purple-100 text-purple-800',
    EM_ENTREGA: 'bg-orange-100 text-orange-800',
    ENTREGUE: 'bg-teal-100 text-teal-800',
    CANCELADO: 'bg-red-100 text-red-700',
  };
  return cores[status] || 'bg-gray-100 text-gray-700';
}

/**
 * Retorna os próximos status possíveis para uma unidade
 */
export function getProximosStatusUnidade(
  statusAtual: StatusPedidoCompra,
): StatusPedidoCompra[] {
  if (statusAtual === 'RASCUNHO') return ['ENVIADO', 'CANCELADO'];
  return [];
}

/**
 * Retorna os próximos status possíveis para a mantenedora
 */
export function getProximosStatusMantenedora(
  statusAtual: StatusPedidoCompra,
): StatusPedidoCompra[] {
  const fluxo: Record<string, StatusPedidoCompra[]> = {
    ENVIADO: ['EM_ANALISE', 'APROVADO', 'CANCELADO'],
    EM_ANALISE: ['APROVADO', 'COMPRADO', 'CANCELADO'],
    APROVADO: ['COMPRADO', 'CANCELADO'],
    COMPRADO: ['EM_ENTREGA'],
    EM_ENTREGA: ['ENTREGUE'],
  };
  return fluxo[statusAtual] || [];
}

/**
 * Exporta os itens de um pedido como CSV
 */
export function exportarPedidoCSV(pedido: PedidoCompra): void {
  const linhas = [
    ['Categoria', 'Descrição', 'Quantidade', 'Unidade de Medida', 'Preço Unitário (R$)', 'Total (R$)', 'Fornecedor'],
    ...pedido.itens.map(item => {
      const precoUnit = item.custoEstimado ?? 0;
      const total = precoUnit * item.quantidade;
      return [
        item.categoria,
        item.descricao,
        String(item.quantidade),
        item.unidadeMedida ?? '',
        precoUnit > 0 ? precoUnit.toFixed(2) : '',
        total > 0 ? total.toFixed(2) : '',
        item._fornecedor ?? '',
      ];
    }),
  ];
  const csv = linhas.map(l => l.map(v => `"${v.replace(/"/g, '""')}"`).join(',')).join('\n');
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `pedido-compra-${pedido.unit?.name ?? 'unidade'}-${pedido.mesReferencia}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}
