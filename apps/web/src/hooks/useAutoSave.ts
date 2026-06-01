/**
 * useAutoSave — Auto-save de formulários no localStorage
 *
 * Salva automaticamente os dados do formulário no localStorage a cada `debounceMs`
 * milissegundos após a última alteração. Ao montar, verifica se há rascunho salvo
 * e chama `onRestore` se existir.
 *
 * Uso:
 *   const { hasDraft, clearDraft, lastSaved } = useAutoSave({
 *     key: `plano-aula-${userId}-${turmaId}`,
 *     data: formState,
 *     onRestore: (saved) => setFormState(saved),
 *   });
 */
import { useEffect, useRef, useState, useCallback } from 'react';

interface UseAutoSaveOptions<T> {
  /** Chave única no localStorage (inclua IDs para evitar colisão entre usuários/turmas) */
  key: string;
  /** Dados atuais do formulário a serem salvos */
  data: T;
  /** Chamado na montagem se houver rascunho salvo — recebe os dados restaurados */
  onRestore?: (saved: T) => void;
  /** Debounce em ms antes de salvar. Padrão: 3000 (3 segundos) */
  debounceMs?: number;
  /** Se false, desabilita o auto-save (ex: após submit bem-sucedido). Padrão: true */
  enabled?: boolean;
}

interface UseAutoSaveReturn {
  /** true se há rascunho salvo no localStorage */
  hasDraft: boolean;
  /** Limpa o rascunho (chamar após submit bem-sucedido) */
  clearDraft: () => void;
  /** Timestamp do último salvamento automático */
  lastSaved: Date | null;
}

export function useAutoSave<T>({
  key,
  data,
  onRestore,
  debounceMs = 3000,
  enabled = true,
}: UseAutoSaveOptions<T>): UseAutoSaveReturn {
  const [hasDraft, setHasDraft] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isFirstRender = useRef(true);
  const onRestoreRef = useRef(onRestore);
  onRestoreRef.current = onRestore;

  // Na montagem: verificar e restaurar rascunho
  useEffect(() => {
    if (!enabled) return;
    try {
      const raw = localStorage.getItem(key);
      if (raw) {
        const parsed = JSON.parse(raw) as { data: T; savedAt: string };
        if (parsed?.data) {
          setHasDraft(true);
          setLastSaved(new Date(parsed.savedAt));
          onRestoreRef.current?.(parsed.data);
        }
      }
    } catch {
      // Rascunho corrompido — ignorar silenciosamente
      localStorage.removeItem(key);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  // A cada mudança nos dados: salvar com debounce
  useEffect(() => {
    if (!enabled) return;

    // Pular o primeiro render (evita sobrescrever rascunho ao restaurar)
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }

    if (timerRef.current) clearTimeout(timerRef.current);

    timerRef.current = setTimeout(() => {
      try {
        const payload = { data, savedAt: new Date().toISOString() };
        localStorage.setItem(key, JSON.stringify(payload));
        setHasDraft(true);
        setLastSaved(new Date());
      } catch {
        // localStorage cheio ou bloqueado — ignorar silenciosamente
      }
    }, debounceMs);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, data, debounceMs, enabled]);

  const clearDraft = useCallback(() => {
    localStorage.removeItem(key);
    setHasDraft(false);
    setLastSaved(null);
  }, [key]);

  return { hasDraft, clearDraft, lastSaved };
}
