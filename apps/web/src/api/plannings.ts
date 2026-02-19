import http from './http';

export interface Planning {
  id: string;
  title: string;
  description?: string;
  status: string;
  type: string;
  classroomId: string;
  curriculumMatrixId: string;
  startDate?: string;
  endDate?: string;
  createdAt?: string;
  updatedAt?: string;
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
