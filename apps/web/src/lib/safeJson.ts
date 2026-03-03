/**
 * Parse seguro de JSON — compatível com dados antigos (strings simples)
 * e novos (objetos serializados). Nunca lança erro.
 */
export function safeJsonParse<T>(value: string | null | undefined, fallback: T): T {
  if (!value) return fallback;
  try {
    return JSON.parse(value) as T;
  } catch {
    // compatibilidade com dados antigos: retorna string como campo "legacy"
    return fallback;
  }
}

export function safeJsonStringify(value: unknown): string {
  try {
    return JSON.stringify(value);
  } catch {
    return '';
  }
}
