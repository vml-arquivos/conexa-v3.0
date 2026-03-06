import http from './http';

export type StatusPedidoCompra =
  | 'RASCUNHO'
  | 'ENVIADO'
  | 'EM_ANALISE'
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
  custoEstimado?: number;
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
  const response = await http.post('/pedidos-compra', dto);
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
  const response = await http.get('/pedidos-compra', { params: filtros });
  return response.data;
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
    COMPRADO: 'bg-purple-100 text-purple-800',
    EM_ENTREGA: 'bg-orange-100 text-orange-800',
    ENTREGUE: 'bg-green-100 text-green-800',
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
    ENVIADO: ['EM_ANALISE', 'CANCELADO'],
    EM_ANALISE: ['COMPRADO', 'CANCELADO'],
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
    ['Categoria', 'Descrição', 'Quantidade', 'Unidade de Medida', 'Custo Estimado (R$)'],
    ...pedido.itens.map(item => [
      item.categoria,
      item.descricao,
      String(item.quantidade),
      item.unidadeMedida ?? '',
      item.custoEstimado != null ? item.custoEstimado.toFixed(2) : '',
    ]),
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
