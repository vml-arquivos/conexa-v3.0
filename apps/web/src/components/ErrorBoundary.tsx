/**
 * ErrorBoundary — captura erros de renderização e exibe página amigável.
 * Usado como errorElement nas rotas do React Router v6.
 */
import { useRouteError, isRouteErrorResponse, useNavigate } from 'react-router-dom';
import { AlertTriangle, ArrowLeft, Home } from 'lucide-react';
import { Button } from './ui/button';

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
