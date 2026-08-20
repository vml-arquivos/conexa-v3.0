import React from 'react';
import { AlertCircle, CheckCircle2, Clock, Users } from 'lucide-react';

interface ActionItem {
  id: string;
  type: 'requisicao' | 'planejamento' | 'atendimento' | 'faltas';
  title: string;
  count: number;
  subtitle: string;
  color: string;
  bgColor: string;
  icon: React.ReactNode;
  action: () => void;
  actionLabel: string;
}

interface ActionRequiredBlockProps {
  items: ActionItem[];
  loading?: boolean;
}

export function ActionRequiredBlock({ items, loading = false }: ActionRequiredBlockProps) {
  if (loading) {
    return (
      <div className="bg-[var(--surface-card)] rounded-2xl border border-[var(--border-default)] p-4">
        <div className="animate-pulse space-y-3">
          <div className="h-4 bg-gray-200 rounded w-1/4"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-24 bg-gray-100 rounded-lg"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!items || items.length === 0) {
    return null;
  }

  return (
    <div className="bg-[var(--surface-card)] rounded-2xl border border-[var(--border-default)] overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-[var(--border-default)]">
        <div className="flex items-center gap-2">
          <AlertCircle className="h-5 w-5 text-[var(--text-brand)]" />
          <h2 className="text-base font-semibold text-[var(--text-primary)]">Ação Exigida</h2>
        </div>
        <p className="text-xs text-[var(--text-secondary)] mt-1">
          {items.reduce((sum, item) => sum + item.count, 0)} itens aguardando sua atenção
        </p>
      </div>

      {/* Grid de Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-2 p-3">
        {items.map((item) => (
          <button
            key={item.id}
            onClick={item.action}
            className="bg-[var(--surface-card)] border border-[var(--border-default)] rounded-xl p-3 text-left hover:border-[var(--border-brand)] transition-colors"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1">
                <div className={`inline-flex items-center justify-center w-8 h-8 rounded-lg ${item.color} bg-opacity-10 mb-2`}>
                  {item.icon}
                </div>
                <p className="text-2xl font-semibold text-[var(--text-primary)]">{item.count}</p>
                <p className="text-xs font-medium text-[var(--text-primary)] mt-1">{item.title}</p>
                <p className="text-xs text-[var(--text-tertiary)] mt-0.5">{item.subtitle}</p>
              </div>
            </div>
            <span className={`mt-3 block w-full py-1.5 px-2 rounded-lg text-center text-xs font-semibold ${item.color} hover:opacity-80 transition-opacity text-white`}>
              {item.actionLabel}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
