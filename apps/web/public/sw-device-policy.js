(function enforceConexaServiceWorkerPolicy() {
  'use strict';

  var navigatorRef = self.navigator;
  var userAgent = navigatorRef.userAgent || '';
  var isMobilePhone = navigatorRef.userAgentData
    ? navigatorRef.userAgentData.mobile === true
    : /Android.+Mobile|iPhone|iPod|IEMobile|Windows Phone|Opera Mini/i.test(userAgent);

  if (isMobilePhone) return;

  self.addEventListener('activate', function removeDesktopServiceWorker(event) {
    event.waitUntil(
      Promise.resolve()
        .then(function deleteDesktopPwaCaches() {
          return self.caches.keys();
        })
        .then(function deleteKnownCaches(keys) {
          return Promise.all(
            keys
              .filter(function isPwaCache(key) {
                return key.indexOf('workbox-precache') === 0 || key === 'assets-cache';
              })
              .map(function deleteCache(key) {
                return self.caches.delete(key);
              }),
          );
        })
        .then(function unregisterDesktopWorker() {
          return self.registration.unregister();
        })
        .then(function loadClientsFromNetwork() {
          return self.clients.matchAll({ type: 'window', includeUncontrolled: true });
        })
        .then(function reloadDesktopClients(clients) {
          return Promise.all(
            clients.map(function reloadClient(client) {
              return client.navigate(client.url);
            }),
          );
        })
        .catch(function keepSiteAvailable(error) {
          console.warn('[Conexa] Não foi possível concluir a remoção do PWA no desktop.', error);
        }),
    );
  });
})();
