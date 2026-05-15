import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { RouterProvider } from 'react-router-dom';
import { AuthProvider } from './app/AuthProvider';
import { AppErrorBoundary } from './components/ErrorBoundary';
import { router } from './app/router';
import { Toaster } from './components/ui/toaster';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AppErrorBoundary>
      <AuthProvider>
        <RouterProvider router={router} />
        <Toaster />
      </AuthProvider>
    </AppErrorBoundary>
  </StrictMode>
);
