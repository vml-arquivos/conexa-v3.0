/**
 * IndicatorsCards — componente compartilhado de cards de indicadores.
 *
 * Padroniza loading skeleton, empty state e error state em todos os dashboards.
 * Substitui implementações duplicadas de "KPI cards" nas páginas de professor,
 * coordenação de unidade e coordenação geral.
 */
import React from 'react';
import { RefreshCw, AlertCircle, BarChart2 } from 'lucide-react';

export type IndicatorTone = 'default' | 'success' | 'warning' | 'danger' | 'info';

export interface IndicatorItem {
  /** Rótulo exibido abaixo do valor */
  label: string;
  /** Valor principal (número, string, percentual…) */
  value: string | number;
  /** Texto auxiliar pequeno abaixo do rótulo (opcional) */
  helperText?: string;
  /** Cor semântica do card */
  tone?: IndicatorTone;
  /** Ícone React opcional */
  icon?: React.ReactNode;
}

interface IndicatorsCardsProps {
  /** Lista de indicadores a exibir */
  items: IndicatorItem[];
  /** Exibe skeleton de carregamento */
  loading?: boolean;
  /** Exibe estado de erro */
  error?: boolean;
  /** Callback do botão de atualizar (aparece no header se fornecido) */
  onRefresh?: () => void;
  /** Título da seção (ex.: "Indicadores da Turma") */
  title?: string;
}

const TONE_CLASSES: Record<IndicatorTone, { card: string; value: string }> = {
  default: { card: 'bg-gray-50 border-gray-200',    value: 'text-gray-800' },
  success: { card: 'bg-green-50 border-green-200',  value: 'text-green-700' },
  warning: { card: 'bg-yellow-50 border-yellow-200',value: 'text-yellow-700' },
  danger:  { card: 'bg-red-50 border-red-200',      value: 'text-red-700' },
  info:    { card: 'bg-blue-50 border-blue-200',    value: 'text-blue-700' },
};

function SkeletonCard() {
  return (
    <div className="border border-gray-200 rounded-xl p-4 animate-pulse">
      <div className="h-7 bg-gray-200 rounded w-1/2 mb-2" />
      <div className="h-4 bg-gray-100 rounded w-3/4" />
    </div>
  );
}

export function IndicatorsCards({
  items,
  loading = false,
  error = false,
  onRefresh,
  title,
}: IndicatorsCardsProps) {
  return (
    <div className="space-y-3">
      {/* Header opcional */}
      {(title || onRefresh) && (
        <div className="flex items-center justify-between">
          {title && (
            <p className="text-sm font-semibold text-gray-700">{title}</p>
          )}
          {onRefresh && (
            <button
              onClick={onRefresh}
              title="Atualizar indicadores"
              className="text-gray-400 hover:text-gray-600 p-1 rounded transition-colors"
            >
              <RefreshCw className="h-4 w-4" />
            </button>
          )}
        </div>
      )}

      {/* Loading state */}
      {loading && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[0, 1, 2, 3].map(i => <SkeletonCard key={i} />)}
        </div>
      )}

      {/* Error state */}
      {!loading && error && (
        <div className="flex items-center gap-3 bg-red-50 border border-red-200 rounded-xl p-4">
          <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0" />
          <div>
            <p className="text-sm font-medium text-red-700">
              Não foi possível carregar os indicadores.
            </p>
            {onRefresh && (
              <button
                onClick={onRefresh}
                className="text-xs text-red-500 underline mt-0.5 hover:text-red-700"
              >
                Tente atualizar
              </button>
            )}
          </div>
        </div>
      )}

      {/* Empty state */}
      {!loading && !error && items.length === 0 && (
        <div className="flex flex-col items-center justify-center py-8 bg-gray-50 border border-gray-200 rounded-xl">
          <BarChart2 className="h-8 w-8 text-gray-300 mb-2" />
          <p className="text-sm text-gray-400">Sem dados para o período selecionado</p>
        </div>
      )}

      {/* Cards */}
      {!loading && !error && items.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {items.map((item, idx) => {
            const tone = item.tone ?? 'default';
            const cls = TONE_CLASSES[tone];
            return (
              <div
                key={idx}
                className={`border rounded-xl p-4 text-center ${cls.card}`}
              >
                {item.icon && (
                  <div className="flex justify-center mb-2">{item.icon}</div>
                )}
                <p className={`text-2xl font-bold ${cls.value}`}>{item.value}</p>
                <p className="text-xs font-medium text-gray-600 mt-1">{item.label}</p>
                {item.helperText && (
                  <p className="text-xs text-gray-400 mt-0.5">{item.helperText}</p>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default IndicatorsCards;
