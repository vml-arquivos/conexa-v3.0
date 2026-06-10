/**
 * offlineDB.ts — Motor de persistência offline do Conexa PWA
 *
 * Estratégia:
 * 1. Dados de referência (alunos, turmas) são pré-carregados no IndexedDB ao logar
 * 2. Ações do professor (chamada, diário, obs.) são salvas localmente imediatamente
 * 3. Fila de sync é drenada quando a rede volta
 * 4. Conflitos resolvidos por regra: chamada = último timestamp, diário = merge, ocorrência = sempre novo
 *
 * Zero dependências externas. Usa IndexedDB nativo.
 */

const DB_NAME = 'conexa-offline';
const DB_VERSION = 1;

// ─── Tipos ────────────────────────────────────────────────────────────────────

export interface OfflineAction {
  id: string;
  type: 'chamada' | 'diario' | 'observacao' | 'ocorrencia' | 'requisicao';
  endpoint: string;
  method: 'POST' | 'PUT' | 'PATCH';
  payload: Record<string, unknown>;
  createdAt: string;
  retries: number;
  status: 'pending' | 'syncing' | 'done' | 'error';
}

export interface CachedChild {
  id: string;
  firstName: string;
  lastName: string;
  photoUrl?: string | null;
  classroomId?: string;
  laudado?: boolean;
  allergies?: string | null;
}

export interface CachedClassroom {
  id: string;
  name: string;
  gradeLevel?: string;
  unitId: string;
}

// ─── Inicialização do banco ───────────────────────────────────────────────────

let db: IDBDatabase | null = null;

export function openDB(): Promise<IDBDatabase> {
  if (db) return Promise.resolve(db);

  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);

    req.onupgradeneeded = (e) => {
      const database = (e.target as IDBOpenDBRequest).result;

      // Store: fila de ações offline
      if (!database.objectStoreNames.contains('actions')) {
        const store = database.createObjectStore('actions', { keyPath: 'id' });
        store.createIndex('status', 'status');
        store.createIndex('type', 'type');
        store.createIndex('createdAt', 'createdAt');
      }

      // Store: cache de alunos (pré-carregado ao logar)
      if (!database.objectStoreNames.contains('children')) {
        const store = database.createObjectStore('children', { keyPath: 'id' });
        store.createIndex('classroomId', 'classroomId');
      }

      // Store: cache de turmas
      if (!database.objectStoreNames.contains('classrooms')) {
        database.createObjectStore('classrooms', { keyPath: 'id' });
      }

      // Store: rascunhos locais (diário não enviado ainda)
      if (!database.objectStoreNames.contains('drafts')) {
        const store = database.createObjectStore('drafts', { keyPath: 'id' });
        store.createIndex('type', 'type');
      }
    };

    req.onsuccess = (e) => {
      db = (e.target as IDBOpenDBRequest).result;
      resolve(db);
    };

    req.onerror = () => reject(req.error);
  });
}

// ─── Helpers genéricos ────────────────────────────────────────────────────────

function txGet<T>(storeName: string, key: string): Promise<T | null> {
  return openDB().then((database) =>
    new Promise((resolve, reject) => {
      const req = database.transaction(storeName, 'readonly').objectStore(storeName).get(key);
      req.onsuccess = () => resolve(req.result ?? null);
      req.onerror = () => reject(req.error);
    }),
  );
}

function txGetAll<T>(storeName: string): Promise<T[]> {
  return openDB().then((database) =>
    new Promise((resolve, reject) => {
      const req = database.transaction(storeName, 'readonly').objectStore(storeName).getAll();
      req.onsuccess = () => resolve(req.result ?? []);
      req.onerror = () => reject(req.error);
    }),
  );
}

function txPut<T>(storeName: string, value: T): Promise<void> {
  return openDB().then((database) =>
    new Promise((resolve, reject) => {
      const req = database.transaction(storeName, 'readwrite').objectStore(storeName).put(value);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    }),
  );
}

function txDelete(storeName: string, key: string): Promise<void> {
  return openDB().then((database) =>
    new Promise((resolve, reject) => {
      const req = database.transaction(storeName, 'readwrite').objectStore(storeName).delete(key);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    }),
  );
}

// ─── Fila de ações offline ────────────────────────────────────────────────────

export function enqueueAction(
  type: OfflineAction['type'],
  endpoint: string,
  method: OfflineAction['method'],
  payload: Record<string, unknown>,
): Promise<string> {
  const id = `${type}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  const action: OfflineAction = {
    id, type, endpoint, method, payload,
    createdAt: new Date().toISOString(),
    retries: 0,
    status: 'pending',
  };
  return txPut('actions', action).then(() => id);
}

export function getPendingActions(): Promise<OfflineAction[]> {
  return txGetAll<OfflineAction>('actions').then((all) =>
    all.filter((a) => a.status === 'pending').sort((a, b) => a.createdAt.localeCompare(b.createdAt)),
  );
}

export function updateActionStatus(id: string, status: OfflineAction['status']): Promise<void> {
  return txGet<OfflineAction>('actions', id).then((action) => {
    if (!action) return;
    return txPut('actions', { ...action, status });
  });
}

export function markActionDone(id: string): Promise<void> {
  return txDelete('actions', id);
}

export function getQueueCount(): Promise<number> {
  return getPendingActions().then((a) => a.length);
}

// ─── Cache de referência (alunos e turmas) ───────────────────────────────────

export const childrenCache = {
  saveAll: (children: CachedChild[]) =>
    openDB().then((database) =>
      new Promise<void>((resolve, reject) => {
        const tx = database.transaction('children', 'readwrite');
        const store = tx.objectStore('children');
        children.forEach((c) => store.put(c));
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      }),
    ),
  getAll: () => txGetAll<CachedChild>('children'),
  getByClassroom: (classroomId: string) =>
    txGetAll<CachedChild>('children').then((all) =>
      all.filter((c) => c.classroomId === classroomId),
    ),
};

export const classroomsCache = {
  saveAll: (classrooms: CachedClassroom[]) =>
    openDB().then((database) =>
      new Promise<void>((resolve, reject) => {
        const tx = database.transaction('classrooms', 'readwrite');
        const store = tx.objectStore('classrooms');
        classrooms.forEach((c) => store.put(c));
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      }),
    ),
  getAll: () => txGetAll<CachedClassroom>('classrooms'),
};

// ─── Rascunhos (diário/observação não enviados) ───────────────────────────────

export const drafts = {
  save: (id: string, type: string, data: unknown) =>
    txPut('drafts', { id, type, data, updatedAt: new Date().toISOString() }),
  get: (id: string) => txGet<{ id: string; type: string; data: unknown }>('drafts', id),
  delete: (id: string) => txDelete('drafts', id),
  getAll: () => txGetAll<{ id: string; type: string; data: unknown; updatedAt: string }>('drafts'),
};

// ─── Sincronizador ────────────────────────────────────────────────────────────

export async function syncPendingActions(
  httpPost: (endpoint: string, payload: unknown) => Promise<unknown>,
  onProgress?: (done: number, total: number) => void,
): Promise<{ synced: number; errors: number }> {
  const pending = await getPendingActions();
  if (pending.length === 0) return { synced: 0, errors: 0 };

  let synced = 0;
  let errors = 0;

  for (const action of pending) {
    try {
      await updateActionStatus(action.id, 'syncing');
      await httpPost(action.endpoint, action.payload);
      await markActionDone(action.id);
      synced++;
    } catch (err) {
      errors++;
      await updateActionStatus(action.id, 'pending');
      console.warn(`[offlineDB] Falha ao sincronizar ${action.type} (${action.id}):`, err);
      // Parar em erro de auth — não tentar os próximos
      if ((err as any)?.response?.status === 401) break;
    }
    onProgress?.(synced + errors, pending.length);
  }

  return { synced, errors };
}

// ─── Pré-carregamento ao logar ────────────────────────────────────────────────

export async function preloadForOffline(
  httpGet: (endpoint: string, params?: Record<string, string>) => Promise<unknown>,
  classroomId?: string,
): Promise<void> {
  try {
    // Carregar turmas acessíveis
    const classroomsRes = await httpGet('/lookup/classrooms/accessible') as any;
    const classrooms: CachedClassroom[] = (Array.isArray(classroomsRes) ? classroomsRes : classroomsRes?.classrooms ?? [])
      .map((c: any) => ({ id: c.id, name: c.name, gradeLevel: c.gradeLevel, unitId: c.unitId }));
    await classroomsCache.saveAll(classrooms);

    // Carregar alunos da turma ativa (ou de todas se não houver filtro)
    const params: Record<string, string> = { limit: '300' };
    if (classroomId) params.classroomId = classroomId;
    const childrenRes = await httpGet('/children', params) as any;
    const children: CachedChild[] = (Array.isArray(childrenRes) ? childrenRes : childrenRes?.data ?? childrenRes?.children ?? [])
      .map((c: any) => ({
        id: c.id,
        firstName: c.firstName,
        lastName: c.lastName,
        photoUrl: c.photoUrl ?? null,
        classroomId: c.enrollments?.find((e: any) => e.status === 'ATIVA')?.classroomId,
        laudado: c.laudado ?? false,
        allergies: c.allergies ?? null,
      }));
    await childrenCache.saveAll(children);

    console.log(`[offlineDB] Pré-carregados: ${classrooms.length} turmas, ${children.length} alunos`);
  } catch (err) {
    console.warn('[offlineDB] Falha no pré-carregamento (modo offline pode ter dados limitados):', err);
  }
}
