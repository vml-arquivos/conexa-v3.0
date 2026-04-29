/**
 * useIdleTimeout.ts
 * Detecta inatividade do usuário e executa callback após o tempo configurado.
 * Eventos monitorados: mousemove, keydown, mousedown, touchstart, scroll, click.
 * Padrão: 15 minutos (900_000 ms).
 */
import { useEffect, useRef, useCallback } from 'react';

const IDLE_EVENTS: (keyof WindowEventMap)[] = [
  'mousemove',
  'keydown',
  'mousedown',
  'touchstart',
  'scroll',
  'click',
];

/**
 * @param onIdle  Callback executado quando o usuário fica inativo pelo tempo definido.
 * @param timeout Tempo em milissegundos. Padrão: 15 minutos.
 */
export function useIdleTimeout(onIdle: () => void, timeout = 15 * 60 * 1000) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onIdleRef = useRef(onIdle);

  // Manter referência atualizada sem recriar o efeito
  useEffect(() => {
    onIdleRef.current = onIdle;
  }, [onIdle]);

  const resetTimer = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      onIdleRef.current();
    }, timeout);
  }, [timeout]);

  useEffect(() => {
    // Iniciar contagem ao montar
    resetTimer();

    IDLE_EVENTS.forEach(event => {
      window.addEventListener(event, resetTimer, { passive: true });
    });

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      IDLE_EVENTS.forEach(event => {
        window.removeEventListener(event, resetTimer);
      });
    };
  }, [resetTimer]);
}
