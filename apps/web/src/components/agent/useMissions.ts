import { useCallback, useEffect, useState } from 'react';
import http from '../../api/http';
import type { Mission } from '../insights/MissionCard';

export interface MissionsState {
  missions: Mission[];
  summary: Record<string, number>;
  loading: boolean;
  error: string | null;
  refresh: () => void;
}

interface CacheEntry { at: number; userKey: string; missions: Mission[]; summary: Record<string, number> }

// Cache em memória (5 min): o selo do topo e o painel compartilham a mesma consulta.
const TTL_MS = 5 * 60 * 1000;
let cache: CacheEntry | null = null;
let inflight: { userKey: string; promise: Promise<CacheEntry> } | null = null;

async function fetchMissions(force: boolean, userKey: string): Promise<CacheEntry> {
  // O cache é por usuário: ao trocar de conta no mesmo navegador, nada vaza.
  if (!force && cache && cache.userKey === userKey && Date.now() - cache.at < TTL_MS) return cache;
  if (inflight && inflight.userKey === userKey) return inflight.promise;
  const promise = http
    .get('/insights/missions', { params: { periodDays: '14' } })
    .then((res) => {
      const entry: CacheEntry = {
        at: Date.now(),
        userKey,
        missions: Array.isArray(res.data?.missions) ? (res.data.missions as Mission[]) : [],
        summary: (res.data?.summary ?? {}) as Record<string, number>,
      };
      cache = entry;
      return entry;
    })
    .finally(() => { if (inflight?.promise === promise) inflight = null; });
  inflight = { userKey, promise };
  return promise;
}

/** Limpa o cache (ex.: ao sair da conta). */
export function resetMissionsCache() { cache = null; }

/**
 * Missões inteligentes do usuário logado (somente leitura, mesma fonte da
 * página "Centro de Missões"). Falhas são silenciosas: o assistente nunca
 * deve atrapalhar o uso do sistema.
 */
export function useMissions(enabled = true, userKey = 'anon'): MissionsState {
  const warm = cache && cache.userKey === userKey ? cache : null;
  const [state, setState] = useState<Omit<MissionsState, 'refresh'>>({
    missions: warm?.missions ?? [],
    summary: warm?.summary ?? {},
    loading: false,
    error: null,
  });

  const load = useCallback((force: boolean) => {
    setState((s) => ({ ...s, loading: true, error: null }));
    fetchMissions(force, userKey)
      .then((c) => setState({ missions: c.missions, summary: c.summary, loading: false, error: null }))
      .catch(() => setState((s) => ({ ...s, loading: false, error: 'Não foi possível carregar as missões agora.' })));
  }, [userKey]);

  useEffect(() => {
    if (enabled) load(false);
  }, [enabled, load]);

  return { ...state, refresh: () => load(true) };
}
