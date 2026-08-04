import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import vm from 'node:vm';

const workerPolicySource = await readFile(new URL('../public/sw-device-policy.js', import.meta.url), 'utf8');

function createWorkerRuntime({ userAgent, userAgentData }) {
  const listeners = new Map();
  const deletedCaches = [];
  const navigations = [];
  let unregisters = 0;
  const client = {
    url: 'https://appcocris.casadf.com.br/app/dashboard',
    navigate: async (url) => { navigations.push(url); },
  };
  const navigator = { userAgent };
  if (userAgentData !== undefined) navigator.userAgentData = userAgentData;
  const self = {
    navigator,
    caches: {
      keys: async () => ['workbox-precache-v2-old', 'assets-cache', 'business-cache'],
      delete: async (key) => { deletedCaches.push(key); return true; },
    },
    registration: { unregister: async () => { unregisters += 1; return true; } },
    clients: { matchAll: async () => [client] },
    addEventListener: (event, callback) => listeners.set(event, callback),
  };

  vm.runInNewContext(workerPolicySource, { self, console, Promise, String });

  return {
    hasActivateListener: () => listeners.has('activate'),
    activate: async () => {
      let completion = Promise.resolve();
      listeners.get('activate')?.({ waitUntil: (promise) => { completion = promise; } });
      await completion;
    },
    deletedCaches,
    navigations,
    unregisters: () => unregisters,
  };
}

test('novo Service Worker remove instalação antiga no desktop e recarrega pela rede', async () => {
  const runtime = createWorkerRuntime({
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
    userAgentData: { mobile: false },
  });

  assert.equal(runtime.hasActivateListener(), true);
  await runtime.activate();
  assert.deepEqual(runtime.deletedCaches.sort(), ['assets-cache', 'workbox-precache-v2-old']);
  assert.equal(runtime.unregisters(), 1);
  assert.deepEqual(runtime.navigations, ['https://appcocris.casadf.com.br/app/dashboard']);
});

test('Service Worker permanece ativo em celular', async () => {
  const runtime = createWorkerRuntime({
    userAgent: 'Mozilla/5.0 (Linux; Android 15; Mobile)',
    userAgentData: { mobile: true },
  });

  assert.equal(runtime.hasActivateListener(), false);
  assert.equal(runtime.unregisters(), 0);
});
