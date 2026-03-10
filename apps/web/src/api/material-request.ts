import http from './http';

export type MaterialCategory = 'HIGIENE' | 'LIMPEZA' | 'ALIMENTACAO' | 'PEDAGOGICO' | 'OUTRO';
export type RequestStatus =
  | 'RASCUNHO'
  | 'SOLICITADO'
  | 'APROVADO'
  | 'REJEITADO'
  | 'ENTREGUE'
  | 'CANCELADO'
  | 'PARCIAL';

export interface MaterialRequestItem {
  item: string;
  quantidade: number;
  unidade?: string;
}

export interface CreateMaterialRequestDto {
  classroomId?: string;
  categoria: MaterialCategory;
  titulo: string;
  descricao?: string;
  itens: MaterialRequestItem[];
  justificativa: string;
  urgencia: 'BAIXA' | 'MEDIA' | 'ALTA';
}

export interface MaterialRequestItemRecord {
  id: string;
  materialId?: string | null; // opcional: itens criados sem catálogo não têm materialId
  productName?: string;       // nome real do item (campo relacional)
  materialName?: string;      // alias de productName para compatibilidade
  quantity: number;
  unit?: string | null;
  observations?: string | null;
  /** Campos de aprovação por item (retornados pelo GET /:id após review) */
  qtyApproved?: number | null;
  approved?: boolean | null;
  approvalReason?: string | null;
}

export interface ReviewData {
  decision: string;
  notes?: string | null;
  reviewedAt?: string;
  reviewedBy?: string;
  isParcial?: boolean;
}

export interface MaterialRequest {
  id: string;
  code: string;
  title: string;
  description?: string;
  type: string;
  quantity: number;
  status: RequestStatus;
  /** Status virtual: pode ser 'PARCIAL' quando _parcial=true no reviewData */
  statusVirtual?: RequestStatus;
  urgencia?: string;
  justificativa?: string;
  itens?: MaterialRequestItem[];
  /** Itens originais do campo description (requisição nova) */
  originalItens?: { item: string; quantidade: number; unidade?: string }[] | null;
  items?: MaterialRequestItemRecord[];
  classroomId?: string;
  classroom?: { id: string; name: string };
  createdBy: string;
  createdByUser?: { id: string; firstName: string; lastName: string; email: string };
  requestedDate: string;
  approvedBy?: string;
  approvedDate?: string;
  observacaoRevisao?: string;
  reviewData?: ReviewData | null;
  createdAt: string;
  updatedAt: string;
}

export interface ItemApprovedDto {
  id: string;
  quantidadeAprovada: number;
}

/** Item de decisão individual para APPROVE_ITEMS */
export interface ReviewItemDecision {
  itemId: string;
  approved: boolean;
  qtyApproved: number;
  reason?: string;
}

export interface ReviewMaterialRequestDto {
  decision: 'APPROVED' | 'REJECTED' | 'ADJUSTED' | 'APPROVE_ITEMS';
  observacao?: string;
  /** Alias para notes (compatibilidade com backend) */
  notes?: string;
  /** Itens com decisão individual (APPROVE_ITEMS) */
  items?: ReviewItemDecision[];
  /** Legado: itens com quantidades ajustadas (ADJUSTED) */
  itemsApproved?: ItemApprovedDto[];
}

/**
 * Professor cria uma requisição de material
 */
export async function createMaterialRequest(dto: CreateMaterialRequestDto): Promise<MaterialRequest> {
  const response = await http.post('/material-requests', dto);
  return response.data;
}

/**
 * Professor lista suas próprias requisições
 */
export async function listMyMaterialRequests(): Promise<MaterialRequest[]> {
  const response = await http.get('/material-requests/minhas');
  return response.data;
}

/**
 * Unidade lista todas as requisições da unidade
 */
export async function listUnitMaterialRequests(filters?: {
  status?: RequestStatus;
  classroomId?: string;
  categoria?: MaterialCategory;
}): Promise<MaterialRequest[]> {
  const response = await http.get('/material-requests', { params: filters });
  return response.data;
}

/**
 * Busca uma requisição pelo ID com detalhes completos (inclui qtyApproved por item)
 */
export async function getMaterialRequestById(id: string): Promise<MaterialRequest> {
  const response = await http.get(`/material-requests/${id}`);
  return response.data;
}

/**
 * Unidade aprova, rejeita ou ajusta uma requisição
 */
export async function reviewMaterialRequest(id: string, dto: ReviewMaterialRequestDto): Promise<MaterialRequest> {
  const payload: Record<string, unknown> = {
    decision: dto.decision,
    notes: dto.notes ?? dto.observacao,
  };
  if (dto.items) payload.items = dto.items;
  if (dto.itemsApproved) payload.itemsApproved = dto.itemsApproved;
  const response = await http.patch(`/material-requests/${id}/review`, payload);
  return response.data;
}

/**
 * Mapeia categoria para label em português
 */
export function getCategoryLabel(category: MaterialCategory | string): string {
  const labels: Record<string, string> = {
    HIGIENE: 'Higiene Pessoal',
    LIMPEZA: 'Limpeza',
    ALIMENTACAO: 'Alimentação',
    PEDAGOGICO: 'Pedagógico',
    ADMINISTRATIVO: 'Administrativo',
    OUTRO: 'Outro',
  };
  return labels[category] || category;
}

/**
 * Mapeia status para label em português
 */
export function getStatusLabel(status: RequestStatus | string): string {
  const labels: Record<string, string> = {
    RASCUNHO: 'Rascunho',
    SOLICITADO: 'Aguardando Aprovação',
    APROVADO: 'Aprovado',
    REJEITADO: 'Rejeitado',
    ENTREGUE: 'Entregue',
    CANCELADO: 'Cancelado',
    PARCIAL: 'Aprovado Parcialmente',
  };
  return labels[status] || status;
}

/**
 * Mapeia status para cor de badge
 */
export function getStatusColor(status: RequestStatus | string): string {
  const colors: Record<string, string> = {
    RASCUNHO: 'bg-gray-100 text-gray-700',
    SOLICITADO: 'bg-yellow-100 text-yellow-800',
    APROVADO: 'bg-green-100 text-green-800',
    REJEITADO: 'bg-red-100 text-red-800',
    ENTREGUE: 'bg-blue-100 text-blue-800',
    CANCELADO: 'bg-gray-100 text-gray-500',
    PARCIAL: 'bg-orange-100 text-orange-800',
  };
  return colors[status] || 'bg-gray-100 text-gray-700';
}
