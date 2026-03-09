import http from './http';

export interface DiaryEvent {
  id: string;
  type: string;
  title: string;
  description: string;
  eventDate: string;
  childId: string;
  classroomId: string;
  // FIX C3.5: opcionais no backend
  planningId?: string | null;
  curriculumEntryId?: string | null;
  createdAt?: string;
  updatedAt?: string;
  [key: string]: unknown;
}

export interface CreateDiaryEventDto {
  type: string;
  title: string;
  description: string;
  eventDate: string;
  childId: string;
  classroomId: string;
  // FIX C3.5: opcionais — backend aceita eventos sem vínculo de planejamento
  planningId?: string;
  curriculumEntryId?: string;
}

export async function getDiaryEvents(): Promise<DiaryEvent[]> {
  const response = await http.get('/diary-events');
  return response.data;
}

/**
 * Remove campos undefined, null ou vazios do payload antes de enviar ao backend
 * Garante que apenas campos válidos sejam enviados na requisição
 */
function cleanPayload<T extends Record<string, unknown>>(payload: T & Record<string, unknown>): Record<string, unknown> {
  const cleaned: Record<string, unknown> = {};
  
  for (const key in payload) {
    const value = payload[key];
    
    // Incluir apenas valores válidos (não undefined, não null, não string vazia)
    if (value !== undefined && value !== null && value !== '') {
      cleaned[key] = value;
    }
  }
  
  return cleaned;
}

export async function createDiaryEvent(data: CreateDiaryEventDto): Promise<DiaryEvent> {
  // Limpar payload antes de enviar
  const cleanedData = cleanPayload(data as unknown as Record<string, unknown>);
  
  // Validar apenas campos obrigatórios do backend (planningId/curriculumEntryId são opcionais)
  const requiredFields: (keyof CreateDiaryEventDto)[] = [
    'type',
    'title',
    'description',
    'eventDate',
    'childId',
    'classroomId',
  ];
  
  for (const field of requiredFields) {
    if (!cleanedData[field]) {
      throw new Error(`Campo obrigatório ausente: ${field}`);
    }
  }
  
  const response = await http.post('/diary-events', cleanedData);
  return response.data;
}
