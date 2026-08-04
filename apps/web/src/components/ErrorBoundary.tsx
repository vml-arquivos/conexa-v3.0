/**
 * ErrorBoundary — captura erros de renderização e exibe página amigável.
 * Usado como errorElement nas rotas do React Router v6.
 */
import { useRouteError, isRouteErrorResponse, useNavigate } from 'react-router-dom';
import { AlertTriangle, ArrowLeft, Home } from 'lucide-react';
import { Component } from 'react';
import type { ErrorInfo, ReactNode } from 'react';
import { Button } from './ui/button';

interface AppErrorBoundaryProps {
  children: ReactNode;
}

interface AppErrorBoundaryState {
  hasError: boolean;
}

/**
 * Última barreira de proteção da aplicação. Erros fora de uma rota (AuthProvider,
 * Toaster ou inicialização do roteador) deixam de resultar em uma tela vazia.
 */
export class AppErrorBoundary extends Component<AppErrorBoundaryProps, AppErrorBoundaryState> {
  state: AppErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): AppErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[Conexa] Erro não tratado na interface.', error, info);
  }

  private recover = async () => {
    try {
      if ('serviceWorker' in navigator) {
        const registrations = await navigator.serviceWorker.getRegistrations();
        await Promise.all(registrations.map((registration) => registration.unregister()));
      }
      if ('caches' in window) {
        const keys = await window.caches.keys();
        await Promise.all(
          keys
            .filter((key) => key.startsWith('workbox-precache') || key === 'assets-cache')
            .map((key) => window.caches.delete(key)),
        );
      }
    } catch {
      // A recarga continua mesmo se o navegador bloquear a limpeza de cache.
    }
    window.location.reload();
  };

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-lg p-8 text-center space-y-6">
          <div className="flex justify-center">
            <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center">
              <AlertTriangle className="h-8 w-8 text-amber-600" />
            </div>
          </div>
          <div className="space-y-2">
            <h1 className="text-2xl font-bold text-gray-900">Não foi possível abrir esta tela</h1>
            <p className="text-gray-500 text-sm leading-relaxed">
              Seus dados não foram apagados. Recarregue os arquivos temporários do sistema para continuar.
            </p>
          </div>
          <Button onClick={() => void this.recover()} className="w-full bg-indigo-600 hover:bg-indigo-700">
            Recarregar o sistema
          </Button>
        </div>
      </div>
    );
  }
}

export function RouteErrorBoundary() {
  const error = useRouteError();
  const navigate = useNavigate();

  let title = 'Página não encontrada';
  let message = 'A página que você tentou acessar não existe ou foi movida.';
  let status = 404;

  if (isRouteErrorResponse(error)) {
    status = error.status;
    if (error.status === 404) {
      title = 'Página não encontrada';
      message = 'A página que você tentou acessar não existe ou foi movida.';
    } else if (error.status === 403) {
      title = 'Acesso negado';
      message = 'Você não tem permissão para acessar esta página.';
    } else {
      title = `Erro ${error.status}`;
      message = error.statusText || 'Ocorreu um erro inesperado.';
    }
  } else if (error instanceof Error) {
    title = 'Erro na aplicação';
    message = error.message || 'Ocorreu um erro inesperado na aplicação.';
    status = 500;
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-lg p-8 text-center space-y-6">
        <div className="flex justify-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
            <AlertTriangle className="h-8 w-8 text-red-500" />
          </div>
        </div>
        <div className="space-y-2">
          <p className="text-sm font-semibold text-red-500 uppercase tracking-wide">
            Erro {status}
          </p>
          <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
          <p className="text-gray-500 text-sm leading-relaxed">{message}</p>
        </div>
        <div className="flex flex-col gap-3">
          <Button
            onClick={() => navigate(-1)}
            variant="outline"
            className="w-full flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Voltar
          </Button>
          <Button
            onClick={() => navigate('/app/planejamentos')}
            className="w-full flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700"
          >
            <Home className="h-4 w-4" />
            Ir para Meus Planejamentos
          </Button>
        </div>
      </div>
    </div>
  );
}
