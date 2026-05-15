/**
 * ErrorBoundary — captura erros de renderização e exibe página amigável.
 *
 * Dois componentes:
 * 1. `AppErrorBoundary` — class component para envolver árvores React (erros de render)
 * 2. `RouteErrorBoundary` — hook-based para usar como `errorElement` no React Router v6
 */
import React from 'react';
import { useRouteError, isRouteErrorResponse, useNavigate } from 'react-router-dom';
import { AlertTriangle, ArrowLeft, Home, RefreshCw, WifiOff, ShieldOff } from 'lucide-react';
import { Button } from './ui/button';

// ─── 1. Class-based Error Boundary (captura erros de rendering) ───────────────

interface AppErrorBoundaryProps {
  children: React.ReactNode;
  /** Fallback customizado opcional */
  fallback?: React.ReactNode;
}

interface AppErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class AppErrorBoundary extends React.Component<AppErrorBoundaryProps, AppErrorBoundaryState> {
  constructor(props: AppErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): AppErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    // Log de erros — pode ser integrado a Sentry/Datadog futuramente
    console.error('[AppErrorBoundary] Erro capturado:', error, info.componentStack);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;

      return (
        <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
          <div className="w-14 h-14 bg-rose-100 rounded-2xl flex items-center justify-center mb-4">
            <AlertTriangle className="h-7 w-7 text-rose-500" />
          </div>
          <h2 className="text-lg font-bold text-gray-800 mb-1">Algo deu errado</h2>
          <p className="text-sm text-gray-500 max-w-sm mb-1">
            Esta seção encontrou um problema e não pôde ser exibida.
          </p>
          {this.state.error?.message && (
            <p className="text-xs text-gray-400 font-mono bg-gray-50 border border-gray-200 rounded-lg px-3 py-1.5 max-w-sm mb-4 break-all">
              {this.state.error.message}
            </p>
          )}
          <button
            onClick={this.handleReset}
            className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white text-sm font-semibold rounded-xl hover:bg-indigo-700 transition-colors"
          >
            <RefreshCw className="h-4 w-4" />
            Tentar novamente
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

// ─── 2. Route-level Error Boundary (React Router v6 errorElement) ─────────────

export function RouteErrorBoundary() {
  const error = useRouteError();
  const navigate = useNavigate();

  let title = 'Página não encontrada';
  let message = 'A página que você tentou acessar não existe ou foi movida.';
  let status = 404;
  let Icon = AlertTriangle;
  let iconBg = 'bg-red-100';
  let iconColor = 'text-red-500';
  let statusColor = 'text-red-500';

  if (isRouteErrorResponse(error)) {
    status = error.status;
    if (error.status === 404) {
      title = 'Página não encontrada';
      message = 'A página que você tentou acessar não existe ou foi movida.';
    } else if (error.status === 403) {
      title = 'Acesso negado';
      message = 'Você não tem permissão para acessar esta página. Verifique se está logado com o perfil correto.';
      Icon = ShieldOff;
      iconBg = 'bg-amber-100';
      iconColor = 'text-amber-500';
      statusColor = 'text-amber-500';
    } else if (error.status === 401) {
      title = 'Sessão expirada';
      message = 'Sua sessão expirou. Por favor, faça login novamente para continuar.';
      Icon = ShieldOff;
      iconBg = 'bg-amber-100';
      iconColor = 'text-amber-500';
      statusColor = 'text-amber-500';
    } else if (error.status === 502 || error.status === 503 || error.status === 504) {
      title = 'Servidor temporariamente indisponível';
      message = 'O servidor está passando por instabilidade. Aguarde alguns instantes e tente novamente. Seus dados estão seguros.';
      Icon = WifiOff;
      iconBg = 'bg-blue-100';
      iconColor = 'text-blue-500';
      statusColor = 'text-blue-500';
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
          <div className={`w-16 h-16 ${iconBg} rounded-full flex items-center justify-center`}>
            <Icon className={`h-8 w-8 ${iconColor}`} />
          </div>
        </div>
        <div className="space-y-2">
          <p className={`text-sm font-semibold ${statusColor} uppercase tracking-wide`}>
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
            onClick={() => navigate('/app/coordenacao-pedagogica')}
            className="w-full flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700"
          >
            <Home className="h-4 w-4" />
            Ir para o Painel
          </Button>
        </div>
      </div>
    </div>
  );
}
