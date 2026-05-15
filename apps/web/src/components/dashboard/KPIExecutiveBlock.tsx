import React from 'react';
import { TrendingUp, TrendingDown } from 'lucide-react';

interface KPIItem {
  id: string;
  label: string;
  value: string | number;
  unit?: string;
  trend?: {
    value: number;
    direction: 'up' | 'down' | 'stable';
    label: string;
  };
  color: string;
  icon: React.ReactNode;
  onClick?: () => void;
}

interface KPIExecutiveBlockProps {
  items: KPIItem[];
  loading?: boolean;
}

export function KPIExecutiveBlock({ items, loading = false }: KPIExecutiveBlockProps) {
  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="bg-white rounded-2xl border border-slate-100 p-4 animate-pulse">
            <div className="h-3 bg-slate-100 rounded w-1/3 mb-3"></div>
            <div className="h-7 bg-slate-100 rounded w-1/2 mb-2"></div>
            <div className="h-2.5 bg-slate-50 rounded w-2/3"></div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
      {items.map((item) => (
        <button
          key={item.id}
          onClick={item.onClick}
          disabled={!item.onClick}
          className={`bg-white rounded-2xl border border-slate-100 p-4 text-left hover:border-blue-200 hover:shadow-sm transition-all ${
            item.onClick ? 'cursor-pointer' : 'cursor-default'
          }`}
        >
          {/* Icon */}
          <div className={`inline-flex items-center justify-center w-9 h-9 rounded-xl ${item.color} bg-opacity-10 mb-3`}>
            {item.icon}
          </div>

          {/* Label — sem uppercase agressivo */}
          <p className="text-[11px] font-medium text-slate-400 tracking-wide">{item.label}</p>

          {/* Value — menor, mais equilibrado */}
          <div className="flex items-baseline gap-1 mt-1.5">
            <p className="text-2xl font-semibold text-slate-800 tabular-nums">{item.value}</p>
            {item.unit && <p className="text-sm text-slate-400">{item.unit}</p>}
          </div>

          {/* Trend */}
          {item.trend && (
            <div className="flex items-center gap-1 mt-2.5">
              {item.trend.direction === 'up' && (
                <TrendingUp className="h-3.5 w-3.5 text-emerald-500" />
              )}
              {item.trend.direction === 'down' && (
                <TrendingDown className="h-3.5 w-3.5 text-red-400" />
              )}
              <span
                className={`text-[11px] font-medium ${
                  item.trend.direction === 'up'
                    ? 'text-emerald-600'
                    : item.trend.direction === 'down'
                      ? 'text-red-500'
                      : 'text-slate-500'
                }`}
              >
                {item.trend.direction === 'up' ? '+' : item.trend.direction === 'down' ? '−' : ''}
                {item.trend.value}% {item.trend.label}
              </span>
            </div>
          )}
        </button>
      ))}
    </div>
  );
}
