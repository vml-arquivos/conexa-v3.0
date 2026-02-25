/**
 * useApiCache — cache in-memory simples para chamadas GET repetidas.
 *
 * Evita N+1 e chamadas duplicadas no mesmo carregamento de página.
 * TTL padrão: 60 segundos.
 *
 * Uso:
 *   const cache = useApiCache();
 *   const data = await cache.get('/reports/unit/coverage', { startDate: '...' }, () =>
 *     http.get('/reports/unit/coverage', { params: { startDate: '...' } }).then(r => r.data)
 *   );
 */

interface CacheEntry<T> {
  data: T;
  expiresAt: number;
}

// Cache global compartilhado entre instâncias do hook (singleton por sessão)
const GLOBAL_CACHE = new Map<string, CacheEntry<unknown>>();

const DEFAULT_TTL_MS = 60_000; // 60 segundos

function buildKey(endpoint: string, params?: Record<string, unknown>): string {
  if (!params || Object.keys(params).length === 0) return endpoint;
  const sorted = Object.keys(params)
    .sort()
    .map(k => `${k}=${params[k]}`)
    .join('&');
  return `${endpoint}?${sorted}`;
}

export function useApiCache(ttlMs = DEFAULT_TTL_MS) {
  async function get<T>(
    endpoint: string,
    params: Record<string, unknown> | undefined,
    fetcher: () => Promise<T>,
  ): Promise<T> {
    const key = buildKey(endpoint, params);
    const now = Date.now();
    const cached = GLOBAL_CACHE.get(key) as CacheEntry<T> | undefined;

    if (cached && cached.expiresAt > now) {
      return cached.data;
    }

    const data = await fetcher();
    GLOBAL_CACHE.set(key, { data, expiresAt: now + ttlMs });
    return data;
  }

  function invalidate(endpoint: string, params?: Record<string, unknown>) {
    const key = buildKey(endpoint, params);
    GLOBAL_CACHE.delete(key);
  }

  function invalidateAll() {
    GLOBAL_CACHE.clear();
  }

  return { get, invalidate, invalidateAll };
}

export default useApiCache;
