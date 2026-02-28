import http from './http';

export type PlanningStatus =
  | 'RASCUNHO'
  | 'PUBLICADO'
  | 'EM_EXECUCAO'
  | 'CONCLUIDO'
  | 'CANCELADO'
  | 'EM_REVISAO'
  | 'APROVADO'
  | 'DEVOLVIDO';

export interface Planning {
  id: string;
  title: string;
  description?: string;
  status: PlanningStatus;
  type: string;
  classroomId: string;
  curriculumMatrixId: string;
  startDate?: string;
  endDate?: string;
  createdAt?: string;
  updatedAt?: string;
  createdBy?: string;
  // Campos do fluxo de revisão
  submittedAt?: string;
  reviewedAt?: string;
  reviewedBy?: string;
  reviewComment?: string;
  [key: string]: unknown;
}

export interface GetPlanningsParams {
  classroomId?: string;
  status?: string;
  startDate?: string;
  endDate?: string;
  type?: string;
}

export async function getPlannings(params?: GetPlanningsParams): Promise<Planning[]> {
  const response = await http.get('/plannings', { params });
  return response.data;
}

export async function getPlanning(id: string): Promise<Planning> {
  const response = await http.get(`/plannings/${id}`);
  return response.data;
}

export async function updatePlanning(id: string, data: Partial<Planning>): Promise<Planning> {
  const response = await http.put(`/plannings/${id}`, data);
  return response.data;
}

// --- Fluxo de Revisão ---

export async function submitPlanningForReview(id: string): Promise<Planning> {
  const response = await http.post(`/plannings/${id}/enviar-revisao`);
  return response.data;
}

export async function approvePlanning(id: string): Promise<Planning> {
  const response = await http.post(`/plannings/${id}/aprovar`);
  return response.data;
}

export async function returnPlanning(id: string, comment: string): Promise<Planning> {
  const response = await http.post(`/plannings/${id}/devolver`, { comment });
  return response.data;
}
