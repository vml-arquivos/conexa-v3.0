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
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="bg-white rounded-2xl border border-gray-100 p-4 animate-pulse">
            <div className="h-4 bg-gray-200 rounded w-1/3 mb-3"></div>
            <div className="h-8 bg-gray-200 rounded w-1/2 mb-2"></div>
            <div className="h-3 bg-gray-100 rounded w-2/3"></div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {items.map((item) => (
        <button
          key={item.id}
          onClick={item.onClick}
          disabled={!item.onClick}
          className={`bg-white rounded-2xl border border-gray-100 p-4 text-left hover:border-blue-200 transition-colors ${
            item.onClick ? 'cursor-pointer' : 'cursor-default'
          }`}
        >
          {/* Icon */}
          <div className={`inline-flex items-center justify-center w-10 h-10 rounded-xl ${item.color} bg-opacity-10 mb-3`}>
            {item.icon}
          </div>

          {/* Label */}
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{item.label}</p>

          {/* Value */}
          <div className="flex items-baseline gap-1 mt-2">
            <p className="text-3xl font-bold text-gray-900">{item.value}</p>
            {item.unit && <p className="text-sm text-gray-500">{item.unit}</p>}
          </div>

          {/* Trend */}
          {item.trend && (
            <div className="flex items-center gap-1 mt-3">
              {item.trend.direction === 'up' && (
                <TrendingUp className="h-4 w-4 text-emerald-500" />
              )}
              {item.trend.direction === 'down' && (
                <TrendingDown className="h-4 w-4 text-red-500" />
              )}
              <span
                className={`text-xs font-semibold ${
                  item.trend.direction === 'up'
                    ? 'text-emerald-600'
                    : item.trend.direction === 'down'
                      ? 'text-red-600'
                      : 'text-gray-600'
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
