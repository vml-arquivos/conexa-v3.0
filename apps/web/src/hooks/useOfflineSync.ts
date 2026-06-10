/**
 * useOfflineSync — Hook de sincronização offline para o Conexa PWA
 *
 * Uso:
 *   const { isOnline, queueCount, syncNow, postOfflineSafe } = useOfflineSync();
 *
 *   // Salva localmente E envia (ou enfileira se offline)
 *   await postOfflineSafe('chamada', '/attendance/register', 'POST', payload);
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  enqueueAction,
  getQueueCount,
  syncPendingActions,
  type OfflineAction,
} from '../services/offlineDB';
import http from '../api/http';

interface UseOfflineSyncReturn {
  isOnline: boolean;
  queueCount: number;
  isSyncing: boolean;
  syncNow: () => Promise<void>;
  postOfflineSafe: (
    type: OfflineAction['type'],
    endpoint: string,
    method: OfflineAction['method'],
    payload: Record<string, unknown>,
  ) => Promise<{ local: boolean; synced: boolean }>;
}

export function useOfflineSync(): UseOfflineSyncReturn {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [queueCount, setQueueCount] = useState(0);
  const [isSyncing, setIsSyncing] = useState(false);
  const syncingRef = useRef(false);

  // Atualizar contagem da fila
  const refreshQueue = useCallback(async () => {
    const count = await getQueueCount();
    setQueueCount(count);
  }, []);

  // Detectar mudanças de conectividade
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      // Ao voltar online, sincronizar automaticamente após 1s
      setTimeout(() => syncNow(), 1000);
    };
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    refreshQueue();

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Função de sincronização
  const syncNow = useCallback(async () => {
    if (syncingRef.current || !navigator.onLine) return;
    syncingRef.current = true;
    setIsSyncing(true);
    try {
      const { synced, errors } = await syncPendingActions(
        async (endpoint, payload) => {
          const res = await http.post(endpoint, payload);
          return res.data;
        },
      );
      if (synced > 0) {
        console.log(`[Sync] ${synced} ações sincronizadas`);
      }
      if (errors > 0) {
        console.warn(`[Sync] ${errors} erros`);
      }
    } finally {
      syncingRef.current = false;
      setIsSyncing(false);
      refreshQueue();
    }
  }, [refreshQueue]);

  // Enviar ou enfileirar ação
  const postOfflineSafe = useCallback(async (
    type: OfflineAction['type'],
    endpoint: string,
    method: OfflineAction['method'],
    payload: Record<string, unknown>,
  ): Promise<{ local: boolean; synced: boolean }> => {
    // Sempre salva localmente primeiro
    await enqueueAction(type, endpoint, method, payload);
    await refreshQueue();

    // Se online, tenta sincronizar imediatamente
    if (navigator.onLine) {
      try {
        const fn = method === 'POST' ? http.post : method === 'PUT' ? http.put : http.patch;
        await fn(endpoint, payload);
        // Sucesso: remove da fila
        const pending = await import('../services/offlineDB').then((m) => m.getPendingActions());
        const last = pending[pending.length - 1];
        if (last) await import('../services/offlineDB').then((m) => m.markActionDone(last.id));
        await refreshQueue();
        return { local: true, synced: true };
      } catch (err) {
        // Falha de rede: mantém na fila
        console.warn('[offlineSync] Falha ao enviar, mantido na fila:', err);
        return { local: true, synced: false };
      }
    }

    return { local: true, synced: false };
  }, [refreshQueue]);

  return { isOnline, queueCount, isSyncing, syncNow, postOfflineSafe };
}
