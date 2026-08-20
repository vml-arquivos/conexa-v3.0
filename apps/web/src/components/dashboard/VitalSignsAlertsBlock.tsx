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
      <div className="bg-[var(--surface-card)] rounded-2xl border border-[var(--border-default)] p-4 animate-pulse">
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
    <div className="bg-[var(--surface-card)] rounded-2xl border border-[var(--border-default)] overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-[var(--border-default)]">
        <div className="flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-[var(--text-brand)]" />
          <h2 className="text-base font-semibold text-[var(--text-primary)]">Sinais Vitais e Alertas</h2>
        </div>
        <p className="text-xs text-[var(--text-secondary)] mt-1">Faltas, ocorrências e desenvolvimento</p>
      </div>

      {/* Content */}
      <div className="p-4 space-y-3">
        {/* Alertas Críticos */}
        {criticalAlerts.length > 0 && (
          <div>
            <p className="text-[11px] font-semibold text-[var(--error)] uppercase tracking-wide mb-1.5">Crítico</p>
            <div className="space-y-2">
              {criticalAlerts.map((alert) => (
                <button
                  key={alert.id}
                  onClick={alert.onClick}
                  className="w-full flex items-start gap-3 p-2.5 rounded-xl bg-[var(--error-bg)] hover:brightness-105 transition-colors border border-[var(--error-border)]"
                >
                  <div className={`flex-shrink-0 w-10 h-10 rounded-lg ${alert.bgColor} flex items-center justify-center`}>
                    {alert.icon}
                  </div>
                  <div className="flex-1 text-left">
                    <p className="text-sm font-medium text-[var(--text-primary)]">{alert.title}</p>
                    <p className="text-xs text-[var(--text-secondary)] mt-0.5">{alert.description}</p>
                  </div>
                  <div className="flex-shrink-0 text-right">
                    <p className="text-lg font-semibold text-[var(--error)]">{alert.count}</p>
                    <p className="text-[11px] text-[var(--text-tertiary)]">itens</p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Alertas de Atenção */}
        {warningAlerts.length > 0 && (
          <div>
            <p className="text-[11px] font-semibold text-[var(--warning)] uppercase tracking-wide mb-1.5">Atenção</p>
            <div className="space-y-2">
              {warningAlerts.map((alert) => (
                <button
                  key={alert.id}
                  onClick={alert.onClick}
                  className="w-full flex items-start gap-3 p-2.5 rounded-xl bg-[var(--warning-bg)] hover:brightness-105 transition-colors border border-[var(--warning-border)]"
                >
                  <div className={`flex-shrink-0 w-10 h-10 rounded-lg ${alert.bgColor} flex items-center justify-center`}>
                    {alert.icon}
                  </div>
                  <div className="flex-1 text-left">
                    <p className="text-sm font-medium text-[var(--text-primary)]">{alert.title}</p>
                    <p className="text-xs text-[var(--text-secondary)] mt-0.5">{alert.description}</p>
                  </div>
                  <div className="flex-shrink-0 text-right">
                    <p className="text-lg font-semibold text-[var(--warning)]">{alert.count}</p>
                    <p className="text-[11px] text-[var(--text-tertiary)]">itens</p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Alertas Informativos */}
        {infoAlerts.length > 0 && (
          <div>
            <p className="text-[11px] font-semibold text-[var(--text-brand)] uppercase tracking-wide mb-1.5">Informativo</p>
            <div className="space-y-2">
              {infoAlerts.map((alert) => (
                <button
                  key={alert.id}
                  onClick={alert.onClick}
                  className="w-full flex items-start gap-3 p-2.5 rounded-xl bg-[var(--surface-brand)] hover:brightness-105 transition-colors border border-[var(--border-brand)]"
                >
                  <div className={`flex-shrink-0 w-10 h-10 rounded-lg ${alert.bgColor} flex items-center justify-center`}>
                    {alert.icon}
                  </div>
                  <div className="flex-1 text-left">
                    <p className="text-sm font-medium text-[var(--text-primary)]">{alert.title}</p>
                    <p className="text-xs text-[var(--text-secondary)] mt-0.5">{alert.description}</p>
                  </div>
                  <div className="flex-shrink-0 text-right">
                    <p className="text-lg font-semibold text-[var(--text-brand)]">{alert.count}</p>
                    <p className="text-[11px] text-[var(--text-tertiary)]">itens</p>
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
