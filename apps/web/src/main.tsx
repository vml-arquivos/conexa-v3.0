import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { RouterProvider } from 'react-router-dom';
import { AuthProvider } from './app/AuthProvider';
import { router } from './app/router';
import { AppErrorBoundary } from './components/ErrorBoundary';
import { Toaster } from './components/ui/toaster';
import './index.css';

const rootElement = document.getElementById('root');

if (!rootElement) {
  throw new Error('Elemento raiz da aplicação não encontrado.');
}

createRoot(rootElement).render(
  <StrictMode>
    <AppErrorBoundary>
      <AuthProvider>
        <RouterProvider router={router} />
        <Toaster />
      </AuthProvider>
    </AppErrorBoundary>
  </StrictMode>
);

window.requestAnimationFrame(() => {
  if (rootElement.hasChildNodes()) {
    const bootWindow = window as Window & { __CONEXA_BOOT_SUCCEEDED__?: () => void };
    bootWindow.__CONEXA_BOOT_SUCCEEDED__?.();
  }
});

// Migração de segurança: versões anteriores do PWA mantinham GETs autenticados
// da API por até 24 horas. Remover esse cache evita que uma leitura antiga
// esconda uma atualização já confirmada no PostgreSQL.
if ('caches' in window) {
  void window.caches
    .keys()
    .then((keys) =>
      Promise.all(
        keys
          .filter((key) => key === 'api-cache' || key.startsWith('api-cache-'))
          .map((key) => window.caches.delete(key)),
      ),
    )
    .catch(() => undefined);
}
