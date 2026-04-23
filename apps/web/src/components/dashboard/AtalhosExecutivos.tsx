import React from 'react';
import { ArrowRight } from 'lucide-react';

interface AtalhoItem {
  label: string;
  desc: string;
  icon: React.ReactNode;
  className: string;
  action: () => void;
}

interface AtalhosExecutivosProps {
  items: AtalhoItem[];
}

/**
 * AtalhosExecutivos - 6 cards de navegação rápida com gradientes
 * Fornece acesso direto aos fluxos principais
 */
export function AtalhosExecutivos({ items }: AtalhosExecutivosProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
      {items?.map(item => (
        <button
          key={item.label}
          onClick={item.action}
          className={`group rounded-2xl bg-gradient-to-br ${item.className} p-[1px] text-left shadow-sm transition-transform duration-200 hover:-translate-y-0.5`}
        >
          <div className="h-full rounded-2xl bg-slate-950/80 px-4 py-4 backdrop-blur-md">
            <div className="flex items-start justify-between gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/10 text-white">
                {item.icon}
              </div>
              <ArrowRight className="h-4 w-4 text-white/60 transition-transform group-hover:translate-x-0.5" />
            </div>
            <p className="mt-3 text-sm font-semibold text-white">{item.label}</p>
            <p className="mt-0.5 text-xs leading-5 text-blue-100/75">{item.desc}</p>
          </div>
        </button>
      ))}
    </div>
  );
}
