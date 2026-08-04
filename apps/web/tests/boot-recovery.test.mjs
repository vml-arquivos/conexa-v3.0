import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import vm from 'node:vm';

const recoverySource = await readFile(new URL('../public/boot-recovery.js', import.meta.url), 'utf8');

function createRuntime() {
  const listeners = new Map();
  const session = new Map();
  let reloads = 0;
  const root = {
    innerHTML: '',
    hasChildNodes: () => false,
  };
  const document = {
    getElementById: (id) => (id === 'root' ? root : null),
  };
  const navigator = {
    serviceWorker: { getRegistrations: async () => [] },
  };
  const window = {
    document,
    navigator,
    caches: { keys: async () => [], delete: async () => true },
    sessionStorage: {
      getItem: (key) => session.get(key) ?? null,
      setItem: (key, value) => session.set(key, value),
      removeItem: (key) => session.delete(key),
    },
    location: { reload: () => { reloads += 1; } },
    addEventListener: (event, callback) => listeners.set(event, callback),
    setTimeout: (callback) => callback(),
  };
  window.window = window;

  vm.runInNewContext(recoverySource, {
    window,
    document,
    navigator,
    console,
    Promise,
    Date,
    String,
  });

  return {
    dispatch: (event, payload) => listeners.get(event)?.(payload),
    reloads: () => reloads,
  };
}

async function settle() {
  await Promise.resolve();
  await Promise.resolve();
  await new Promise((resolve) => setImmediate(resolve));
}

test('falha de imagem não reinicia a aplicação', async () => {
  const runtime = createRuntime();
  runtime.dispatch('error', { target: { tagName: 'IMG' } });
  await settle();
  assert.equal(runtime.reloads(), 0);
});

test('falha de script antes do primeiro render executa uma recuperação', async () => {
  const runtime = createRuntime();
  runtime.dispatch('error', { target: { tagName: 'SCRIPT' } });
  await settle();
  assert.equal(runtime.reloads(), 1);
});
