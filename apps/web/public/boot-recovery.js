(function installConexaBootRecovery() {
  'use strict';

  var recoveryKey = 'conexa:boot-recovery';
  var recoveryWindowMs = 60000;

  function rootIsEmpty() {
    var root = document.getElementById('root');
    return !root || !root.hasChildNodes();
  }

  function showRecoveryScreen() {
    var root = document.getElementById('root');
    if (!root) return;
    root.innerHTML =
      '<main style="min-height:100vh;display:flex;align-items:center;justify-content:center;padding:24px;background:#f8fafc;font-family:system-ui,sans-serif">' +
      '<section style="max-width:460px;background:#fff;border:1px solid #e2e8f0;border-radius:18px;padding:32px;text-align:center;box-shadow:0 14px 40px rgba(15,23,42,.10)">' +
      '<h1 style="margin:0 0 12px;color:#0f172a;font-size:24px">Atualização necessária</h1>' +
      '<p style="margin:0 0 22px;color:#475569;line-height:1.55">O sistema protegeu seus dados, mas não conseguiu carregar os arquivos da interface. Tente novamente.</p>' +
      '<button id="conexa-recover-button" style="border:0;border-radius:10px;background:#4f46e5;color:white;padding:12px 20px;font-weight:700;cursor:pointer">Recarregar o sistema</button>' +
      '</section></main>';
    var button = document.getElementById('conexa-recover-button');
    if (button) button.addEventListener('click', clearCachesAndReload);
  }

  function clearCachesAndReload() {
    var unregister = 'serviceWorker' in navigator
      ? navigator.serviceWorker.getRegistrations().then(function unregisterAll(registrations) {
          return Promise.all(
            registrations.map(function unregister(registration) {
              return registration.unregister();
            }),
          );
        })
      : Promise.resolve();
    var clearCaches = 'caches' in window
      ? window.caches.keys().then(function clearPwaCaches(keys) {
          return Promise.all(
            keys
              .filter(function isPwaCache(key) {
                return key.indexOf('workbox-precache') === 0 || key === 'assets-cache';
              })
              .map(function deleteCache(key) {
                return window.caches.delete(key);
              }),
          );
        })
      : Promise.resolve();

    Promise.all([unregister, clearCaches]).finally(function reload() {
      window.location.reload();
    });
  }

  function recoverOnce() {
    if (!rootIsEmpty()) return;
    var previousRecovery = Number(window.sessionStorage.getItem(recoveryKey) || 0);
    var now = Date.now();
    if (previousRecovery && now - previousRecovery < recoveryWindowMs) {
      showRecoveryScreen();
      return;
    }
    window.sessionStorage.setItem(recoveryKey, String(now));
    clearCachesAndReload();
  }

  window.addEventListener('error', function handleBootError(event) {
    var target = event && event.target;
    var tagName = target && target.tagName ? String(target.tagName).toUpperCase() : '';
    var relation = target && target.rel ? String(target.rel).toLowerCase() : '';
    var isCriticalResource =
      tagName === 'SCRIPT' ||
      (tagName === 'LINK' && (relation === 'stylesheet' || relation === 'modulepreload'));

    // Imagens, favicon e outros recursos decorativos nunca devem provocar uma
    // recarga da aplicação. A recuperação automática é reservada a erros JS e
    // falhas nos recursos indispensáveis ao primeiro render.
    if (event.error || isCriticalResource) {
      window.setTimeout(recoverOnce, 0);
    }
  });
  window.addEventListener('unhandledrejection', function handleBootRejection() {
    window.setTimeout(recoverOnce, 0);
  });

  window.__CONEXA_BOOT_SUCCEEDED__ = function markBootSucceeded() {
    window.sessionStorage.removeItem(recoveryKey);
  };
})();
