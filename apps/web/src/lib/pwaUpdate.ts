/**
 * pwaUpdate — utilitários para destravar cache do PWA no iOS/Android.
 *
 * Em PWAs com Service Worker (Workbox), o iOS frequentemente continua servindo
 * a versão antiga em cache mesmo após um deploy novo. Este helper força a
 * atualização: pede update do SW, limpa os caches e recarrega a página.
 */

export const BUILD_ID: string =
  typeof __BUILD_ID__ !== 'undefined' ? __BUILD_ID__ : 'dev';

/**
 * Força atualização total do PWA:
 * 1. Atualiza/desregistra Service Workers
 * 2. Limpa todos os caches do Cache Storage
 * 3. Recarrega a página a partir da rede
 */
export async function hardRefreshPWA(): Promise<void> {
  try {
    if ('serviceWorker' in navigator) {
      const regs = await navigator.serviceWorker.getRegistrations();
      await Promise.all(
        regs.map(async (reg) => {
          try { await reg.update(); } catch { /* ignore */ }
          // Desregistrar garante que o próximo load pegue o SW novo do servidor
          try { await reg.unregister(); } catch { /* ignore */ }
        }),
      );
    }
    if ('caches' in window) {
      const keys = await caches.keys();
      await Promise.all(keys.map((k) => caches.delete(k)));
    }
  } catch {
    // Mesmo se algo falhar, seguimos para o reload
  } finally {
    // reload "forçado" — busca o index.html novo
    window.location.reload();
  }
}
