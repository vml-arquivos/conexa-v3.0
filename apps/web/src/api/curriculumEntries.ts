import http from './http';

export interface CurriculumEntry {
  id: string;
  // FIX C1: campo real do banco é matrixId (não curriculumMatrixId)
  matrixId: string;
  date: string;
  campoDeExperiencia: string;
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
      // FIX C1: parâmetro correto conforme QueryCurriculumMatrixEntryDto do backend
      matrixId: params.matrixId,
      startDate: params.startDate,
      endDate: params.endDate,
    },
  });
  return response.data;
}
