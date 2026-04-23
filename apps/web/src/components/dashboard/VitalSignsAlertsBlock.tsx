import React from 'react';
import { AlertTriangle, TrendingUp, Users } from 'lucide-react';

interface Alert {
  id: string;
  type: 'critical' | 'warning' | 'info';
  title: string;
  count: number;
  description: string;
  color: string;
  bgColor: string;
  icon: React.ReactNode;
  onClick: () => void;
}

interface VitalSignsAlertsBlockProps {
  alerts: Alert[];
  loading?: boolean;
}

export function VitalSignsAlertsBlock({ alerts, loading = false }: VitalSignsAlertsBlockProps) {
  if (loading) {
    return (
      <div className="bg-white rounded-2xl border border-gray-100 p-6 animate-pulse">
        <div className="h-4 bg-gray-200 rounded w-1/4 mb-6"></div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-24 bg-gray-100 rounded-lg"></div>
          ))}
        </div>
      </div>
    );
  }

  if (!alerts || alerts.length === 0) {
    return null;
  }

  // Separar alertas por tipo
  const criticalAlerts = alerts.filter((a) => a.type === 'critical');
  const warningAlerts = alerts.filter((a) => a.type === 'warning');
  const infoAlerts = alerts.filter((a) => a.type === 'info');

  return (
    <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-100">
        <div className="flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-orange-500" />
          <h2 className="text-lg font-bold text-gray-900">Sinais Vitais e Alertas</h2>
        </div>
        <p className="text-sm text-gray-500 mt-1">Faltas, ocorrências e desenvolvimento</p>
      </div>

      {/* Content */}
      <div className="p-6 space-y-4">
        {/* Alertas Críticos */}
        {criticalAlerts.length > 0 && (
          <div>
            <p className="text-xs font-semibold text-red-600 uppercase tracking-wide mb-2">🔴 Crítico</p>
            <div className="space-y-2">
              {criticalAlerts.map((alert) => (
                <button
                  key={alert.id}
                  onClick={alert.onClick}
                  className="w-full flex items-start gap-3 p-3 rounded-lg bg-red-50 hover:bg-red-100 transition-colors border border-red-100"
                >
                  <div className={`flex-shrink-0 w-10 h-10 rounded-lg ${alert.bgColor} flex items-center justify-center`}>
                    {alert.icon}
                  </div>
                  <div className="flex-1 text-left">
                    <p className="text-sm font-semibold text-gray-900">{alert.title}</p>
                    <p className="text-xs text-gray-600 mt-0.5">{alert.description}</p>
                  </div>
                  <div className="flex-shrink-0 text-right">
                    <p className="text-lg font-bold text-red-600">{alert.count}</p>
                    <p className="text-xs text-gray-500">itens</p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Alertas de Atenção */}
        {warningAlerts.length > 0 && (
          <div>
            <p className="text-xs font-semibold text-amber-600 uppercase tracking-wide mb-2">🟠 Atenção</p>
            <div className="space-y-2">
              {warningAlerts.map((alert) => (
                <button
                  key={alert.id}
                  onClick={alert.onClick}
                  className="w-full flex items-start gap-3 p-3 rounded-lg bg-amber-50 hover:bg-amber-100 transition-colors border border-amber-100"
                >
                  <div className={`flex-shrink-0 w-10 h-10 rounded-lg ${alert.bgColor} flex items-center justify-center`}>
                    {alert.icon}
                  </div>
                  <div className="flex-1 text-left">
                    <p className="text-sm font-semibold text-gray-900">{alert.title}</p>
                    <p className="text-xs text-gray-600 mt-0.5">{alert.description}</p>
                  </div>
                  <div className="flex-shrink-0 text-right">
                    <p className="text-lg font-bold text-amber-600">{alert.count}</p>
                    <p className="text-xs text-gray-500">itens</p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Alertas Informativos */}
        {infoAlerts.length > 0 && (
          <div>
            <p className="text-xs font-semibold text-blue-600 uppercase tracking-wide mb-2">ℹ️ Informativo</p>
            <div className="space-y-2">
              {infoAlerts.map((alert) => (
                <button
                  key={alert.id}
                  onClick={alert.onClick}
                  className="w-full flex items-start gap-3 p-3 rounded-lg bg-blue-50 hover:bg-blue-100 transition-colors border border-blue-100"
                >
                  <div className={`flex-shrink-0 w-10 h-10 rounded-lg ${alert.bgColor} flex items-center justify-center`}>
                    {alert.icon}
                  </div>
                  <div className="flex-1 text-left">
                    <p className="text-sm font-semibold text-gray-900">{alert.title}</p>
                    <p className="text-xs text-gray-600 mt-0.5">{alert.description}</p>
                  </div>
                  <div className="flex-shrink-0 text-right">
                    <p className="text-lg font-bold text-blue-600">{alert.count}</p>
                    <p className="text-xs text-gray-500">itens</p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
