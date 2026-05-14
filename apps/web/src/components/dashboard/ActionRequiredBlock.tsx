import React from 'react';
import { AlertCircle, ArrowRight } from 'lucide-react';

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
      <div className="bg-white rounded-2xl border border-gray-100 p-6">
        <div className="animate-pulse space-y-3">
          <div className="h-4 bg-gray-200 rounded w-1/4" />
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-28 bg-gray-100 rounded-xl" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!items || items.length === 0) return null;

  const totalItens = items.reduce((sum, item) => sum + item.count, 0);

  return (
    <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm">
      {/* Header */}
      <div className="px-5 py-4 border-b border-gray-50 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <AlertCircle className="h-4 w-4 text-rose-500" />
          <h2 className="text-sm font-bold text-gray-900">Ação Exigida</h2>
        </div>
        {totalItens > 0 ? (
          <span className="text-xs bg-rose-100 text-rose-700 font-bold px-2.5 py-1 rounded-full border border-rose-200">
            {totalItens} item{totalItens !== 1 ? 'ns' : ''} pendente{totalItens !== 1 ? 's' : ''}
          </span>
        ) : (
          <span className="text-xs bg-emerald-100 text-emerald-700 font-semibold px-2.5 py-1 rounded-full border border-emerald-200">
            Tudo em dia ✓
          </span>
        )}
      </div>

      {/* Grid de Cards — 2 colunas em mobile, 4 em desktop */}
      <div className="grid grid-cols-2 lg:grid-cols-4 divide-x divide-y divide-gray-50">
        {items.map((item) => {
          const hasItems = item.count > 0;
          return (
            <button
              key={item.id}
              onClick={item.action}
              className={`group relative p-4 text-left transition-all duration-200
                ${hasItems
                  ? `${item.bgColor} hover:brightness-95`
                  : 'bg-gray-50/60 hover:bg-gray-100/60'
                }`}
            >
              {/* Ícone */}
              <div className={`inline-flex items-center justify-center w-9 h-9 rounded-xl mb-3
                ${hasItems ? 'bg-white/60 shadow-sm' : 'bg-white/80'}`}>
                {item.icon}
              </div>

              {/* Contador */}
              <p className={`text-2xl font-bold leading-none mb-1
                ${hasItems ? 'text-gray-900' : 'text-gray-400'}`}>
                {item.count}
              </p>

              {/* Título */}
              <p className={`text-xs font-semibold leading-snug
                ${hasItems ? 'text-gray-700' : 'text-gray-400'}`}>
                {item.title}
              </p>

              {/* Subtítulo */}
              <p className={`text-[11px] mt-0.5 leading-snug
                ${hasItems ? 'text-gray-500' : 'text-gray-400'}`}>
                {item.subtitle}
              </p>

              {/* CTA */}
              {hasItems && (
                <div className={`mt-3 flex items-center gap-1 text-[11px] font-semibold ${item.color} opacity-80 group-hover:opacity-100 transition-opacity`}>
                  {item.actionLabel}
                  <ArrowRight className="h-3 w-3" />
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
