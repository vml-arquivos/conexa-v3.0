/**
 * microgestures.ts — Adapter de microgestos UI → CreateDiaryEventDto
 *
 * Converte ações rápidas do professor (sono, alimentação, humor, higiene,
 * ocorrência, observação) para o formato exato esperado pelo backend:
 * POST /diary-events  (CreateDiaryEventDto)
 *
 * Campos obrigatórios no DTO:
 *   type, title, description, eventDate, childId, classroomId
 *
 * Enums DiaryEventType disponíveis no backend:
 *   ATIVIDADE_PEDAGOGICA | REFEICAO | HIGIENE | SONO | COMPORTAMENTO |
 *   DESENVOLVIMENTO | SAUDE | FAMILIA | OBSERVACAO | AVALIACAO | OUTRO
 */

import http from '../api/http';

// ─── Tipos públicos ───────────────────────────────────────────────────────────

/** Tipos de microgesto suportados pela UI do professor */
export type MicrogestureKind =
  | 'SONO_OK'
  | 'SONO_RUIM'
  | 'ALIMENTACAO_BEM'
  | 'ALIMENTACAO_RECUSOU'
  | 'HUMOR_CALMO'
  | 'HUMOR_CHOROSO'
  | 'HUMOR_IRRITADO'
  | 'HIGIENE_TROCA'
  | 'OCORRENCIA'
  | 'OBSERVACAO';

export interface MicrogestureParams {
  /** ID da criança (CUID obrigatório) */
  childId: string;
  /** ID da turma (CUID obrigatório) */
  classroomId: string;
  /** Tipo do microgesto */
  kind: MicrogestureKind;
  /** Payload extra (texto livre, duração sono em minutos, etc.) */
  payload?: {
    texto?: string;
    sonoMinutos?: number;
    medicaoAlimentar?: Record<string, unknown>;
  };
  /** Data/hora do evento (ISO 8601). Padrão: agora */
  eventDate?: string;
}

export interface MicrogestureResult {
  id: string;
  type: string;
  title: string;
  description: string;
  eventDate: string;
  childId: string;
  classroomId: string;
}

// ─── Mapeamento UI → DTO ──────────────────────────────────────────────────────

interface MicrogestureMapping {
  type: string;
  title: string;
  description: (payload?: MicrogestureParams['payload']) => string;
}

const MAPPING: Record<MicrogestureKind, MicrogestureMapping> = {
  SONO_OK: {
    type: 'SONO',
    title: 'Sono',
    description: (p) =>
      p?.sonoMinutos
        ? `Dormiu bem (${p.sonoMinutos} min)`
        : 'Dormiu bem',
  },
  SONO_RUIM: {
    type: 'SONO',
    title: 'Sono',
    description: (p) =>
      p?.sonoMinutos
        ? `Sono agitado (${p.sonoMinutos} min)`
        : 'Sono agitado',
  },
  ALIMENTACAO_BEM: {
    type: 'REFEICAO',
    title: 'Alimentação',
    description: (p) => p?.texto ? `Comeu bem — ${p.texto}` : 'Comeu bem',
  },
  ALIMENTACAO_RECUSOU: {
    type: 'REFEICAO',
    title: 'Alimentação',
    description: (p) => p?.texto ? `Recusou alimentação — ${p.texto}` : 'Recusou alimentação',
  },
  HUMOR_CALMO: {
    type: 'COMPORTAMENTO',
    title: 'Humor',
    description: (p) => p?.texto ? `Calmo — ${p.texto}` : 'Calmo',
  },
  HUMOR_CHOROSO: {
    type: 'COMPORTAMENTO',
    title: 'Humor',
    description: (p) => p?.texto ? `Choroso — ${p.texto}` : 'Choroso',
  },
  HUMOR_IRRITADO: {
    type: 'COMPORTAMENTO',
    title: 'Humor',
    description: (p) => p?.texto ? `Irritado — ${p.texto}` : 'Irritado',
  },
  HIGIENE_TROCA: {
    type: 'HIGIENE',
    title: 'Higiene',
    description: (p) => p?.texto ? `Troca realizada — ${p.texto}` : 'Troca realizada',
  },
  OCORRENCIA: {
    type: 'SAUDE',
    title: 'Ocorrência',
    description: (p) => p?.texto || 'Ocorrência registrada',
  },
  OBSERVACAO: {
    type: 'OBSERVACAO',
    title: 'Observação',
    description: (p) => p?.texto || 'Observação do professor',
  },
};

// ─── Função principal ─────────────────────────────────────────────────────────

/**
 * Cria um DiaryEvent no backend a partir de um microgesto da UI do professor.
 *
 * @throws Error com mensagem amigável em caso de validação ou falha de rede
 */
export async function createMicrogestureEvent(
  params: MicrogestureParams,
): Promise<MicrogestureResult> {
  const { childId, classroomId, kind, payload, eventDate } = params;

  // Validação de campos obrigatórios
  if (!childId || !childId.trim()) {
    throw new Error('Selecione uma criança antes de registrar o microgesto.');
  }
  if (!classroomId || !classroomId.trim()) {
    throw new Error(
      'Turma não identificada. Recarregue a página e tente novamente.',
    );
  }

  const mapping = MAPPING[kind];
  if (!mapping) {
    throw new Error(`Tipo de microgesto desconhecido: ${kind}`);
  }

  const dto: Record<string, unknown> = {
    type: mapping.type,
    title: mapping.title,
    description: mapping.description(payload),
    eventDate: eventDate ?? new Date().toISOString(),
    childId,
    classroomId,
    // Campos opcionais enriquecidos quando disponíveis
    ...(payload?.sonoMinutos !== undefined && { sonoMinutos: payload.sonoMinutos }),
    ...(payload?.medicaoAlimentar && { medicaoAlimentar: payload.medicaoAlimentar }),
  };

  try {
    const response = await http.post('/diary-events', dto);
    return response.data as MicrogestureResult;
  } catch (err: unknown) {
    const axiosErr = err as { response?: { data?: { message?: string | string[] } } };
    const msg = axiosErr?.response?.data?.message;
    if (Array.isArray(msg)) {
      throw new Error(msg.join('; '));
    }
    if (typeof msg === 'string') {
      throw new Error(msg);
    }
    throw new Error('Erro ao salvar microgesto. Verifique sua conexão e tente novamente.');
  }
}

/**
 * Busca eventos do dia para uma turma (para indicador "Registrado / Sem registro").
 * Retorna um Set de childIds que já têm ao menos 1 evento hoje.
 */
export async function fetchRegisteredChildrenToday(
  classroomId: string,
): Promise<Set<string>> {
  try {
    const today = new Date();
    const startDate = new Date(today);
    startDate.setHours(0, 0, 0, 0);
    const endDate = new Date(today);
    endDate.setHours(23, 59, 59, 999);

    const res = await http.get('/diary-events', {
      params: {
        classroomId,
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        limit: 200,
      },
    });

    const events: Array<{ childId?: string }> = Array.isArray(res.data)
      ? res.data
      : res.data?.data ?? [];

    const registered = new Set<string>();
    for (const ev of events) {
      if (ev.childId) registered.add(ev.childId);
    }
    return registered;
  } catch {
    // Falha silenciosa — indicador fica em estado neutro
    return new Set<string>();
  }
}
