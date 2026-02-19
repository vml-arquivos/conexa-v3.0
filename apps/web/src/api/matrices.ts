import http from './http';

export interface CurriculumMatrix {
  id: string;
  name: string;
  description?: string;
  [key: string]: unknown;
}

export async function getCurriculumMatrices(): Promise<CurriculumMatrix[]> {
  const response = await http.get('/curriculum-matrices');
  return response.data;
}
