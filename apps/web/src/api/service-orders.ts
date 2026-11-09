import http from './http';

export type ServiceOrderStatus =
  | 'ABERTA' | 'ACEITA' | 'EM_EXECUCAO' | 'AGUARDANDO_AVALIACAO' | 'ENCERRADA' | 'CANCELADA';
export type ServiceOrderPriority = 'BAIXA' | 'MEDIA' | 'ALTA' | 'URGENTE';
export type ServiceOrderCategory =
  | 'ELETRICA' | 'HIDRAULICA' | 'ALVENARIA_PINTURA' | 'MOBILIARIO' | 'PORTAS_JANELAS'
  | 'AREA_EXTERNA' | 'EQUIPAMENTOS' | 'TI_REDES' | 'LIMPEZA_DEDETIZACAO' | 'SEGURANCA' | 'OUTRO';
export type ServiceOrderResult = 'EXECUTADO' | 'PARCIAL' | 'NAO_EXECUTADO';

export interface ServiceOrderEvent {
  id: string;
  type: string;
  fromStatus: ServiceOrderStatus | null;
  toStatus: ServiceOrderStatus | null;
  message: string | null;
  authorId: string;
  authorName: string | null;
  createdAt: string;
}

export interface ServiceOrderAttachment {
  id: string;
  kind: 'SOLICITACAO' | 'EXECUCAO' | string;
  originalName: string;
  mimeType: string;
  url: string;
  uploadedByName: string | null;
  createdAt: string;
}

export interface ServiceOrder {
  id: string;
  number: number;
  unitId: string;
  unit?: { id: string; name: string; code: string };
  title: string;
  description: string;
  category: ServiceOrderCategory;
  priority: ServiceOrderPriority;
  location: string;
  status: ServiceOrderStatus;
  requestedById: string;
  requestedByName: string | null;
  assignedToId: string | null;
  assignedToName: string | null;
  dueDate: string | null;
  acceptedAt: string | null;
  startedAt: string | null;
  completedAt: string | null;
  closedAt: string | null;
  executionReport: string | null;
  executionResult: ServiceOrderResult | null;
  evaluationResult: ServiceOrderResult | null;
  evaluationNotes: string | null;
  evaluatedByName: string | null;
  reopenCount: number;
  isOverdue: boolean;
  createdAt: string;
  events?: ServiceOrderEvent[];
  attachments?: ServiceOrderAttachment[];
}

export interface ServiceOrderSummary {
  profile: 'ADMIN' | 'MANTENEDORA' | 'MANUTENCAO' | 'UNIDADE' | 'PROFESSOR';
  counts: Record<ServiceOrderStatus, number>;
  open: number;
  overdue: number;
  urgent: number;
  unassigned: number;
  mine: number;
  awaitingEvaluation: number;
  avgResolutionHours: number | null;
  units: { unitId: string; unitName: string; open: number; overdue: number; total: number }[];
}

export interface ListParams {
  status?: string;
  unitId?: string;
  assignedTo?: string;
  priority?: ServiceOrderPriority;
  category?: ServiceOrderCategory;
  overdue?: boolean;
  q?: string;
  limit?: number;
  page?: number;
}

export async function listServiceOrders(params: ListParams = {}) {
  const { overdue, ...rest } = params;
  const res = await http.get<{ total: number; items: ServiceOrder[] }>('/service-orders', {
    params: { ...rest, ...(overdue ? { overdue: 'true' } : {}) },
  });
  return res.data;
}
export async function getServiceOrder(id: string) {
  return (await http.get<ServiceOrder>(`/service-orders/${id}`)).data;
}
export async function getServiceOrderSummary() {
  return (await http.get<ServiceOrderSummary>('/service-orders/summary')).data;
}
export async function getMaintenanceTeam() {
  return (await http.get<{ id: string; name: string }[]>('/service-orders/team')).data;
}
export async function createServiceOrder(body: {
  title: string; description: string; location: string;
  category?: ServiceOrderCategory; priority?: ServiceOrderPriority; unitId?: string;
}) {
  return (await http.post<ServiceOrder>('/service-orders', body)).data;
}
export async function acceptServiceOrder(id: string, body: { dueDate: string; assignedToId?: string; message?: string }) {
  return (await http.post<ServiceOrder>(`/service-orders/${id}/accept`, body)).data;
}
export async function updateServiceOrder(id: string, body: { dueDate?: string; assignedToId?: string; priority?: ServiceOrderPriority; message?: string }) {
  return (await http.patch<ServiceOrder>(`/service-orders/${id}`, body)).data;
}
export async function startServiceOrder(id: string) {
  return (await http.post<ServiceOrder>(`/service-orders/${id}/start`)).data;
}
export async function completeServiceOrder(id: string, body: { report: string; result: ServiceOrderResult }) {
  return (await http.post<ServiceOrder>(`/service-orders/${id}/complete`, body)).data;
}
export async function evaluateServiceOrder(id: string, body: { result: ServiceOrderResult; notes?: string; reopen?: boolean }) {
  return (await http.post<ServiceOrder>(`/service-orders/${id}/evaluate`, body)).data;
}
export async function cancelServiceOrder(id: string, reason: string) {
  return (await http.post<ServiceOrder>(`/service-orders/${id}/cancel`, { reason })).data;
}
export async function commentServiceOrder(id: string, message: string) {
  return (await http.post<ServiceOrder>(`/service-orders/${id}/comments`, { message })).data;
}
export async function uploadServiceOrderFile(id: string, file: File) {
  const form = new FormData();
  form.append('file', file);
  return (await http.post(`/service-orders/${id}/attachments`, form)).data;
}

/** URL absoluta de um anexo (servido em /uploads pela API). */
export function attachmentUrl(url: string): string {
  const base = String(http.defaults.baseURL ?? '').replace(/\/$/, '');
  return /^https?:/.test(url) ? url : `${base}${url}`;
}
