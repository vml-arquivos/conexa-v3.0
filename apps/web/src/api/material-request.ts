import http from './http';

export type MaterialCategory = 'HIGIENE' | 'LIMPEZA' | 'ALIMENTACAO' | 'PEDAGOGICO' | 'OUTRO';
export type RequestStatus = 'RASCUNHO' | 'SOLICITADO' | 'APROVADO' | 'REJEITADO' | 'ENTREGUE' | 'CANCELADO';

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

export interface MaterialRequest {
  id: string;
  code: string;
  title: string;
  description?: string;
  type: string;
  quantity: number;
  status: RequestStatus;
  urgencia?: string;
  justificativa?: string;
  itens?: MaterialRequestItem[];
  classroomId?: string;
  createdBy: string;
  requestedDate: string;
  approvedBy?: string;
  approvedDate?: string;
  observacaoRevisao?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ReviewMaterialRequestDto {
  decision: 'APPROVED' | 'REJECTED';
  observacao?: string;
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
 * Unidade aprova ou rejeita uma requisição
 */
export async function reviewMaterialRequest(id: string, dto: ReviewMaterialRequestDto): Promise<MaterialRequest> {
  const response = await http.patch(`/material-requests/${id}/review`, dto);
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
  };
  return colors[status] || 'bg-gray-100 text-gray-700';
}
