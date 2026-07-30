import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { RouterProvider } from 'react-router-dom';
import { AuthProvider } from './app/AuthProvider';
import { router } from './app/router';
import { Toaster } from './components/ui/toaster';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AuthProvider>
      <RouterProvider router={router} />
      <Toaster />
    </AuthProvider>
  </StrictMode>
);

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
