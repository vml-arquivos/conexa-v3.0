import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Bell, AlertTriangle, CheckCircle, Clock, RefreshCw } from 'lucide-react';
import { Button } from '../ui/button';
import http from '../../api/http';

interface Pendencia {
  id: string;
  tipo: 'PLANEJAMENTO' | 'DIARIO' | 'RELATORIO' | 'MATERIAL' | 'CORRECAO';
  titulo: string;
  descricao: string;
  prazo?: string;
  urgente?: boolean;
  status?: string;
}

interface PendenciasPanelProps {
  classroomId?: string;
}

function PendenciaIcon({ tipo }: { tipo: Pendencia['tipo'] }) {
  const icons: Record<Pendencia['tipo'], React.ReactNode> = {
    PLANEJAMENTO: <Clock className="h-4 w-4 text-blue-500" />,
    DIARIO: <CheckCircle className="h-4 w-4 text-green-500" />,
    RELATORIO: <AlertTriangle className="h-4 w-4 text-yellow-500" />,
    MATERIAL: <Bell className="h-4 w-4 text-orange-500" />,
    CORRECAO: <AlertTriangle className="h-4 w-4 text-red-500" />,
  };
  return <>{icons[tipo]}</>;
}

function PendenciaTypeLabel({ tipo }: { tipo: Pendencia['tipo'] }) {
  const labels: Record<Pendencia['tipo'], string> = {
    PLANEJAMENTO: 'Planejamento',
    DIARIO: 'Diário',
    RELATORIO: 'Relatório',
    MATERIAL: 'Material',
    CORRECAO: 'Correção Solicitada',
  };
  const colors: Record<Pendencia['tipo'], string> = {
    PLANEJAMENTO: 'bg-blue-50 text-blue-700',
    DIARIO: 'bg-green-50 text-green-700',
    RELATORIO: 'bg-yellow-50 text-yellow-700',
    MATERIAL: 'bg-orange-50 text-orange-700',
    CORRECAO: 'bg-red-50 text-red-700',
  };
  return (
    <span className={`text-xs px-2 py-0.5 rounded font-medium ${colors[tipo]}`}>
      {labels[tipo]}
    </span>
  );
}

export function PendenciasPanel({ classroomId }: PendenciasPanelProps) {
  const [pendencias, setPendencias] = useState<Pendencia[]>([]);
  const [loading, setLoading] = useState(true);

  const loadPendencias = useCallback(async () => {
    try {
      setLoading(true);
      // Tentar buscar pendências reais do backend
      const params: Record<string, string> = {};
      if (classroomId) params.classroomId = classroomId;
      const response = await http.get('/reports/teacher/pendencias', { params });
      setPendencias(response.data || []);
    } catch {
      // Se o endpoint não existir ainda, mostrar estado vazio
      setPendencias([]);
    } finally {
      setLoading(false);
    }
  }, [classroomId]);

  useEffect(() => {
    loadPendencias();
  }, [loadPendencias]);

  const urgentes = pendencias.filter(p => p.urgente);
  const normais = pendencias.filter(p => !p.urgente);

  return (
    <Card className={pendencias.length > 0 ? 'border-yellow-200' : 'border-gray-100'}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <Bell className={`h-4 w-4 ${pendencias.length > 0 ? 'text-yellow-500' : 'text-gray-400'}`} />
            Pendências e Alertas
            {pendencias.length > 0 && (
              <span className="bg-yellow-100 text-yellow-800 text-xs font-bold px-2 py-0.5 rounded-full">
                {pendencias.length}
              </span>
            )}
          </CardTitle>
          <Button variant="ghost" size="sm" onClick={loadPendencias} disabled={loading} className="h-7 w-7 p-0">
            <RefreshCw className={`h-3 w-3 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {loading && (
          <div className="flex items-center justify-center py-4 text-gray-400 text-sm">
            <RefreshCw className="h-4 w-4 animate-spin mr-2" />
            Verificando pendências...
          </div>
        )}

        {!loading && pendencias.length === 0 && (
          <div className="flex items-center gap-2 py-3 text-green-600">
            <CheckCircle className="h-5 w-5" />
            <p className="text-sm font-medium">Tudo em dia! Nenhuma pendência encontrada.</p>
          </div>
        )}

        {!loading && pendencias.length > 0 && (
          <div className="space-y-3">
            {urgentes.length > 0 && (
              <div>
                <p className="text-xs font-bold text-red-600 uppercase tracking-wide mb-2">⚠️ Urgentes</p>
                <div className="space-y-2">
                  {urgentes.map(p => (
                    <div key={p.id} className="p-3 rounded-lg bg-red-50 border border-red-100">
                      <div className="flex items-start gap-2">
                        <PendenciaIcon tipo={p.tipo} />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <p className="text-sm font-medium text-gray-900 truncate">{p.titulo}</p>
                            <PendenciaTypeLabel tipo={p.tipo} />
                          </div>
                          <p className="text-xs text-gray-600">{p.descricao}</p>
                          {p.prazo && (
                            <p className="text-xs text-red-600 mt-1 font-medium">
                              Prazo: {new Date(p.prazo).toLocaleDateString('pt-BR')}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {normais.length > 0 && (
              <div>
                {urgentes.length > 0 && <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2 mt-3">Outras Pendências</p>}
                <div className="space-y-2">
                  {normais.map(p => (
                    <div key={p.id} className="p-3 rounded-lg bg-gray-50 border border-gray-100">
                      <div className="flex items-start gap-2">
                        <PendenciaIcon tipo={p.tipo} />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <p className="text-sm font-medium text-gray-900 truncate">{p.titulo}</p>
                            <PendenciaTypeLabel tipo={p.tipo} />
                          </div>
                          <p className="text-xs text-gray-600">{p.descricao}</p>
                          {p.prazo && (
                            <p className="text-xs text-gray-500 mt-1">
                              Prazo: {new Date(p.prazo).toLocaleDateString('pt-BR')}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
