import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { ClipboardList, RefreshCw, Package, Clock, CheckCircle, XCircle, Truck } from 'lucide-react';
import { Button } from '../ui/button';
import http from '../../api/http';
import {
  getCategoryLabel,
  getStatusLabel,
  getStatusColor,
  type MaterialRequest,
} from '../../api/material-request';

interface MaterialRequestListProps {
  refreshTrigger?: number;
}

function StatusBadge({ status }: { status: string }) {
  const colorClass = getStatusColor(status);
  const label = getStatusLabel(status);
  const icons: Record<string, React.ReactNode> = {
    SOLICITADO: <Clock className="h-3 w-3" />,
    APROVADO: <CheckCircle className="h-3 w-3" />,
    REJEITADO: <XCircle className="h-3 w-3" />,
    ENTREGUE: <Truck className="h-3 w-3" />,
  };
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${colorClass}`}>
      {icons[status]}
      {label}
    </span>
  );
}

function UrgenciaBadge({ urgencia }: { urgencia?: string }) {
  if (!urgencia) return null;
  const colors: Record<string, string> = {
    BAIXA: 'bg-green-50 text-green-700',
    MEDIA: 'bg-yellow-50 text-yellow-700',
    ALTA: 'bg-red-50 text-red-700',
  };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${colors[urgencia] || 'bg-gray-50 text-gray-600'}`}>
      {urgencia === 'ALTA' ? '⚠️ ' : ''}Urgência {urgencia.charAt(0) + urgencia.slice(1).toLowerCase()}
    </span>
  );
}

export function MaterialRequestList({ refreshTrigger }: MaterialRequestListProps) {
  const [requests, setRequests] = useState<MaterialRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadRequests = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      // Tenta /minhas (professor) primeiro; se 403, tenta /material-requests (coordenação)
      let data: MaterialRequest[] = [];
      try {
        const res = await http.get('/material-requests/minhas');
        data = res.data ?? [];
      } catch (err: unknown) {
        const status = (err as { response?: { status?: number } })?.response?.status;
        if (status === 403) {
          // Usuário é coordenação/direção — busca todas as requisições da unidade
          const res2 = await http.get('/material-requests');
          data = res2.data ?? [];
        } else {
          throw err;
        }
      }
      setRequests(data);
    } catch {
      setError('Não foi possível carregar as requisições. Verifique sua conexão.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadRequests();
  }, [loadRequests, refreshTrigger]);

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <ClipboardList className="h-5 w-5 text-primary" />
            Minhas Requisições
          </CardTitle>
          <Button variant="ghost" size="sm" onClick={loadRequests} disabled={loading} className="h-8 gap-1 text-xs">
            <RefreshCw className={`h-3 w-3 ${loading ? 'animate-spin' : ''}`} />
            Atualizar
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {loading && (
          <div className="flex items-center justify-center py-8 text-gray-400">
            <RefreshCw className="h-5 w-5 animate-spin mr-2" />
            Carregando requisições...
          </div>
        )}

        {error && !loading && (
          <div className="text-center py-6 text-red-500 text-sm">
            <XCircle className="h-8 w-8 mx-auto mb-2 opacity-50" />
            {error}
          </div>
        )}

        {!loading && !error && requests.length === 0 && (
          <div className="text-center py-8 text-gray-400">
            <Package className="h-10 w-10 mx-auto mb-2 opacity-30" />
            <p className="text-sm font-medium">Nenhuma requisição encontrada</p>
            <p className="text-xs mt-1">Suas solicitações de materiais aparecerão aqui.</p>
          </div>
        )}

        {!loading && !error && requests.length > 0 && (
          <div className="space-y-3">
            {requests.map(req => (
              <div
                key={req.id}
                className="p-3 rounded-lg border border-gray-100 bg-gray-50/50 hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm text-gray-900 truncate">{req.title}</p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {getCategoryLabel(req.type)} &bull;{' '}
                      {new Date(req.requestedDate || req.createdAt).toLocaleDateString('pt-BR')}
                    </p>
                  </div>
                  <StatusBadge status={req.status} />
                </div>

                {req.urgencia && (
                  <div className="mb-2">
                    <UrgenciaBadge urgencia={req.urgencia} />
                  </div>
                )}

                {req.description && (
                  <p className="text-xs text-gray-600 mb-2 line-clamp-2">{req.description}</p>
                )}

                {req.status === 'REJEITADO' && req.observacaoRevisao && (
                  <div className="mt-2 p-2 bg-red-50 rounded border border-red-100">
                    <p className="text-xs text-red-700">
                      <strong>Motivo da rejeição:</strong> {req.observacaoRevisao}
                    </p>
                  </div>
                )}

                {req.status === 'APROVADO' && req.approvedDate && (
                  <p className="text-xs text-green-600 mt-1">
                    ✓ Aprovado em {new Date(req.approvedDate).toLocaleDateString('pt-BR')}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
