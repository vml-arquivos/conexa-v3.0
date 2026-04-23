import React from 'react';
import { AlertCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';

interface Alerta {
  id: string;
  titulo: string;
  descricao?: string;
}

interface AlertasSectionProps {
  loading?: boolean;
  alertasReais?: {
    total: number;
    criticos: Alerta[];
    atencao: Alerta[];
  } | null;
  alertasFallback?: string[];
}

/**
 * AlertasSection - Seção de alertas com loading state
 * Mostra alertas críticos e de atenção com fallback para alertas do dashboard
 */
export function AlertasSection({
  loading = false,
  alertasReais,
  alertasFallback = [],
}: AlertasSectionProps) {
  // Loading state
  if (loading) {
    return (
      <Card className="rounded-2xl border-2 border-blue-200 bg-blue-50">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2 text-blue-800">
            <AlertCircle className="h-5 w-5" />
            Atualizando alertas
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-blue-700">Carregando alertas da unidade e resumo de diários...</p>
        </CardContent>
      </Card>
    );
  }

  // Sem alertas reais e sem fallback
  if ((!alertasReais || alertasReais.total === 0) && alertasFallback.length === 0) {
    return null;
  }

  // Alertas reais do banco
  if (alertasReais && alertasReais.total > 0) {
    return (
      <div className="space-y-2">
        {alertasReais.criticos?.length > 0 && (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-4">
            <p className="text-sm font-bold text-red-800 mb-2 flex items-center gap-2">
              <AlertCircle className="h-4 w-4" />
              {alertasReais.criticos.length} alerta{alertasReais.criticos.length > 1 ? 's' : ''} crítico{alertasReais.criticos.length > 1 ? 's' : ''}
            </p>
            <ul className="space-y-1">
              {alertasReais.criticos?.map(a => (
                <li key={a?.id ?? a.titulo} className="text-sm text-red-700 flex items-start gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-red-500 flex-shrink-0 mt-1.5" />
                  <span>
                    <strong>{a?.titulo}</strong>
                    {a?.descricao && ` — ${a.descricao}`}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {alertasReais.atencao?.length > 0 && (
          <div className="rounded-2xl border border-orange-200 bg-orange-50 p-4">
            <p className="text-sm font-bold text-orange-800 mb-2 flex items-center gap-2">
              <AlertCircle className="h-4 w-4" />
              {alertasReais.atencao.length} atenção
            </p>
            <ul className="space-y-1">
              {alertasReais.atencao?.map(a => (
                <li key={a?.id ?? a.titulo} className="text-sm text-orange-700 flex items-start gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-orange-500 flex-shrink-0 mt-1.5" />
                  {a?.titulo}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    );
  }

  // Fallback: alertas do dashboard
  if (alertasFallback?.length > 0) {
    return (
      <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
        <p className="text-sm font-bold text-amber-800 mb-2 flex items-center gap-2">
          <AlertCircle className="h-4 w-4" /> Atenção hoje
        </p>
        <ul className="space-y-1">
          {alertasFallback.map((a, i) => (
            <li key={i} className="text-sm text-amber-700 flex items-start gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 flex-shrink-0 mt-1.5" />
              {typeof a === 'string' ? a : (a?.mensagem ?? JSON.stringify(a))}
            </li>
          ))}
        </ul>
      </div>
    );
  }

  return null;
}
