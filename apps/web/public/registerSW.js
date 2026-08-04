(function applyConexaDevicePolicy() {
  'use strict';

  var navigatorRef = window.navigator;
  var userAgent = navigatorRef.userAgent || '';
  var isMobilePhone = navigatorRef.userAgentData
    ? navigatorRef.userAgentData.mobile === true
    : /Android.+Mobile|iPhone|iPod|IEMobile|Windows Phone|Opera Mini/i.test(userAgent);

  window.__CONEXA_IS_MOBILE_PHONE__ = isMobilePhone;

  function deletePwaCaches() {
    if (!('caches' in window)) return Promise.resolve();
    return window.caches.keys().then(function deleteKnownCaches(keys) {
      return Promise.all(
        keys
          .filter(function isPwaCache(key) {
            return key.indexOf('workbox-precache') === 0 || key === 'assets-cache';
          })
          .map(function deleteCache(key) {
            return window.caches.delete(key);
          }),
      );
    });
  }

  if (!isMobilePhone) {
    Array.prototype.forEach.call(
      document.querySelectorAll('link[rel="manifest"]'),
      function removeManifest(link) {
        link.remove();
      },
    );

    if ('serviceWorker' in navigatorRef) {
      navigatorRef.serviceWorker
        .getRegistrations()
        .then(function unregisterDesktopPwa(registrations) {
          return Promise.all(
            registrations.map(function unregister(registration) {
              return registration.unregister();
            }),
          ).then(function cleanAndReload() {
            return deletePwaCaches().then(function reloadLegacyPage() {
              var migrationKey = 'conexa:desktop-pwa-removed';
              if (
                (registrations.length > 0 || navigatorRef.serviceWorker.controller) &&
                !window.sessionStorage.getItem(migrationKey)
              ) {
                window.sessionStorage.setItem(migrationKey, '1');
                window.location.reload();
              }
            });
          });
        })
        .catch(function ignoreDesktopCleanupFailure() {
          // A aplicação web continua funcionando mesmo se o navegador bloquear
          // a consulta ao Service Worker.
        });
    } else {
      void deletePwaCaches();
    }
    return;
  }

  if (!document.querySelector('link[rel="manifest"]')) {
    var manifest = document.createElement('link');
    manifest.rel = 'manifest';
    manifest.href = '/manifest.mobile.webmanifest';
    document.head.appendChild(manifest);
  }

  if ('serviceWorker' in navigatorRef) {
    window.addEventListener('load', function registerMobilePwa() {
      navigatorRef.serviceWorker
        .register('/sw.js', { scope: '/', updateViaCache: 'none' })
        .then(function updateRegistration(registration) {
          return registration.update();
        })
        .catch(function reportRegistrationFailure(error) {
          console.warn('[Conexa] O modo offline não pôde ser ativado.', error);
        });
    });
  }
})();
