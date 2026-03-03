// apps/web/src/lib/matrizHelpers.ts
//
// Shape confirmado do model Classroom (schema.prisma):
//   ageGroupMin: Int (meses, default 0)
//   ageGroupMax: Int (meses, default 48)
//   name: String
// Não existe campo "segment" — segmento é inferido por faixa etária ou nome.
//
import { LOOKUP_DIARIO_2026 } from '../data/lookupDiario2026';

export type Segmento = 'EI01' | 'EI02' | 'EI03';

/**
 * Detecta o segmento pedagógico da turma a partir dos dados retornados pela API.
 * Usa ageGroupMin/ageGroupMax (meses) como fonte primária, nome da turma como fallback.
 * Se não identificar, retorna null (sem quebrar a UI).
 */
export function detectarSegmento(classroom: Record<string, unknown>): Segmento | null {
  // Tentar campo "segment" direto (caso seja adicionado no futuro)
  if (classroom.segment && ['EI01', 'EI02', 'EI03'].includes(classroom.segment as string)) {
    return classroom.segment as Segmento;
  }

  // Tentar por faixa etária em meses (fonte primária no schema atual)
  const min = (classroom.ageGroupMin ?? classroom.ageMin ?? classroom.minAge ?? null) as number | null;
  if (min !== null) {
    if (min <= 6)  return 'EI01';  // 0 a 6 meses (bebês)
    if (min <= 42) return 'EI02';  // até 3 anos e 6 meses
    return 'EI03';                  // 4 a 5 anos e 11 meses
  }

  // Tentar por nome da turma como fallback
  const nome = ((classroom.name ?? '') as string).toUpperCase();
  if (nome.includes('EI01') || nome.includes('BERÇÁRIO') || nome.includes('BERCARIO')) return 'EI01';
  if (nome.includes('EI02') || nome.includes('MATERNAL')) return 'EI02';
  if (nome.includes('EI03') || nome.includes('PRÉ') || nome.includes('PRE')) return 'EI03';

  // Não conseguiu detectar — retorna null, UI exibe "Nenhum objetivo previsto"
  return null;
}

export function getObjetivosDoDia(date: Date, segmento: Segmento | null) {
  if (!segmento) return [];
  const ddmm = `${String(date.getDate()).padStart(2, '0')}/${String(date.getMonth() + 1).padStart(2, '0')}`;
  const entrada = (LOOKUP_DIARIO_2026 as Record<string, Record<string, unknown[]>>)[ddmm];
  if (!entrada) return [];
  return (entrada[segmento] ?? []) as unknown[];
}
