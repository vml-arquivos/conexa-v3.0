import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import vm from 'node:vm';

const policySource = await readFile(new URL('../public/registerSW.js', import.meta.url), 'utf8');

async function executePolicy({ userAgent, userAgentData, registrations = [] }) {
  const loadListeners = [];
  const links = [];
  const registerCalls = [];
  const deletedCaches = [];
  const session = new Map();
  const navigator = {
    userAgent,
    serviceWorker: {
      controller: null,
      getRegistrations: async () => registrations,
      register: async (...args) => {
        registerCalls.push(args);
        return { update: async () => undefined };
      },
    },
  };
  if (userAgentData !== undefined) navigator.userAgentData = userAgentData;

  const document = {
    head: { appendChild: (link) => links.push(link) },
    createElement: () => ({ rel: '', href: '', remove() {} }),
    querySelector: () => links.find((link) => link.rel === 'manifest') ?? null,
    querySelectorAll: () => links.filter((link) => link.rel === 'manifest'),
  };
  const window = {
    navigator,
    document,
    caches: {
      keys: async () => ['workbox-precache-v2-test', 'assets-cache', 'business-cache'],
      delete: async (key) => {
        deletedCaches.push(key);
        return true;
      },
    },
    sessionStorage: {
      getItem: (key) => session.get(key) ?? null,
      setItem: (key, value) => session.set(key, value),
    },
    location: { reload() {} },
    addEventListener: (event, callback) => {
      if (event === 'load') loadListeners.push(callback);
    },
  };
  window.window = window;

  vm.runInNewContext(policySource, {
    window,
    document,
    navigator,
    console,
    Promise,
    Array,
  });
  await Promise.resolve();
  await Promise.resolve();
  for (const listener of loadListeners) await listener();
  await Promise.resolve();

  return { window, links, registerCalls, deletedCaches };
}

test('desktop não recebe manifest nem registra PWA', async () => {
  const registration = { unregisterCalled: false, async unregister() { this.unregisterCalled = true; } };
  const result = await executePolicy({
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
    userAgentData: { mobile: false },
    registrations: [registration],
  });

  assert.equal(result.window.__CONEXA_IS_MOBILE_PHONE__, false);
  assert.equal(result.links.length, 0);
  assert.equal(result.registerCalls.length, 0);
  assert.equal(registration.unregisterCalled, true);
  assert.deepEqual(result.deletedCaches.sort(), ['assets-cache', 'workbox-precache-v2-test']);
});

test('iPhone recebe manifest e registra Service Worker', async () => {
  const result = await executePolicy({
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X)',
  });

  assert.equal(result.window.__CONEXA_IS_MOBILE_PHONE__, true);
  assert.equal(result.links[0]?.href, '/manifest.mobile.webmanifest');
  assert.equal(result.registerCalls[0]?.[0], '/sw.js');
  assert.equal(result.registerCalls[0]?.[1]?.scope, '/');
  assert.equal(result.registerCalls[0]?.[1]?.updateViaCache, 'none');
});

test('tablet Android não recebe oferta de instalação', async () => {
  const result = await executePolicy({
    userAgent: 'Mozilla/5.0 (Linux; Android 14; Tablet) AppleWebKit/537.36',
  });

  assert.equal(result.window.__CONEXA_IS_MOBILE_PHONE__, false);
  assert.equal(result.links.length, 0);
  assert.equal(result.registerCalls.length, 0);
});
