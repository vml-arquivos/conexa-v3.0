import http from './http';

export interface CurriculumEntry {
  id: string;
  curriculumMatrixId: string;
  date: string;
  objetivoBNCC: string;
  objetivoCurriculo: string;
  intencionalidade: string;
  exemploAtividade: string;
  createdAt?: string;
  updatedAt?: string;
  [key: string]: unknown;
}

export interface GetCurriculumEntriesParams {
  matrixId: string;
  startDate: string;
  endDate: string;
}

export async function getCurriculumEntries(params: GetCurriculumEntriesParams): Promise<CurriculumEntry[]> {
  const response = await http.get('/curriculum-matrix-entries', {
    params: {
      curriculumMatrixId: params.matrixId,
      startDate: params.startDate,
      endDate: params.endDate,
    },
  });
  return response.data;
}
