import React from 'react';
import { BookOpen, ClipboardList, FileText } from 'lucide-react';
import { KPIGrid } from './KPIGrid';
import { AtalhosExecutivos } from './AtalhosExecutivos';

interface ModuloAvaliacaoPlanoProps {
  // KPI props
  totalPendencias: number;
  diariosEstaSemana: number;
  diariosPublicados: number;
  diariosRascunho: number;
  
  // Atalhos
  atalhosAvaliacao: any[];
  
  // Ações pendentes
  planejamentosParaRevisar: number;
  diariosEmRascunho: number;
  
  // Handlers
  onPendenciasClick: () => void;
  onDiariosClick: () => void;
  onAtalhoClick: (atalho: any) => void;
  onPlanejamentosClick: () => void;
  onDiariosRascunhoClick: () => void;
}

/**
 * ModuloAvaliacaoPlano - Módulo 1: Avaliação do Plano
 * Agrupa KPIs, atalhos e ações relacionadas a planejamentos e diários
 */
export function ModuloAvaliacaoPlano({
  totalPendencias,
  diariosEstaSemana,
  diariosPublicados,
  diariosRascunho,
  atalhosAvaliacao,
  planejamentosParaRevisar,
  diariosEmRascunho,
  onPendenciasClick,
  onDiariosClick,
  onAtalhoClick,
  onPlanejamentosClick,
  onDiariosRascunhoClick,
}: ModuloAvaliacaoPlanoProps) {
  return (
    <div className="space-y-4">
      {/* Heading do módulo */}
      <div className="flex items-center gap-2 mb-4">
        <div className="w-1 h-6 bg-blue-600 rounded-full" />
        <h2 className="text-lg font-bold text-gray-900">Avaliação do Plano</h2>
        <p className="text-sm text-gray-500 ml-auto">Planejamentos, diários e execução</p>
      </div>

      {/* KPI: Pendências + Diários */}
      <div className="grid grid-cols-2 sm:grid-cols-2 gap-3">
        {/* Pendências */}
        <button
          onClick={onPendenciasClick}
          className="rounded-2xl border border-slate-200 bg-slate-900 p-4 text-white text-left hover:bg-slate-800 transition-colors group"
        >
          <p className="text-[11px] font-semibold uppercase tracking-[0.15em] text-slate-400">Pendências</p>
          <p className="mt-1.5 text-3xl font-bold group-hover:text-blue-300 transition-colors">{totalPendencias}</p>
          <p className="mt-1 text-xs text-slate-400">planejamentos · diários</p>
          <p className="mt-2 text-[10px] text-slate-500 group-hover:text-slate-300">Ver detalhes →</p>
        </button>

        {/* Diários */}
        <button
          onClick={onDiariosClick}
          className="rounded-2xl border border-slate-200 bg-slate-900 p-4 text-white text-left hover:bg-slate-800 transition-colors group"
        >
          <p className="text-[11px] font-semibold uppercase tracking-[0.15em] text-slate-400">Diários</p>
          <p className="mt-1.5 text-3xl font-bold group-hover:text-amber-300 transition-colors">{diariosEstaSemana ?? 0}</p>
          <p className="mt-1 text-xs text-slate-400">{diariosPublicados} publicados · {diariosRascunho} rascunho(s)</p>
          <p className="mt-2 text-[10px] text-slate-500 group-hover:text-slate-300">Analisar →</p>
        </button>
      </div>

      {/* Atalhos: Planejamentos, Diários, Relatórios */}
      <AtalhosExecutivos items={atalhosAvaliacao} />

      {/* Ações pendentes */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {planejamentosParaRevisar > 0 && (
          <button
            onClick={onPlanejamentosClick}
            className="flex items-center gap-3 p-4 bg-amber-50 border-2 border-amber-200 rounded-2xl text-left hover:bg-amber-100 transition-all"
          >
            <span className="w-10 h-10 bg-amber-500 text-white rounded-xl flex items-center justify-center text-lg font-bold flex-shrink-0">
              {planejamentosParaRevisar}
            </span>
            <div>
              <p className="text-sm font-bold text-amber-800">Planejamentos</p>
              <p className="text-xs text-amber-600">aguardando revisão</p>
            </div>
          </button>
        )}
        
        {diariosEmRascunho > 0 && (
          <button
            onClick={onDiariosRascunhoClick}
            className="flex items-center gap-3 p-4 bg-blue-50 border-2 border-blue-200 rounded-2xl text-left hover:bg-blue-100 transition-all"
          >
            <span className="w-10 h-10 bg-blue-500 text-white rounded-xl flex items-center justify-center text-lg font-bold flex-shrink-0">
              {diariosEmRascunho}
            </span>
            <div>
              <p className="text-sm font-bold text-blue-800">Diários</p>
              <p className="text-xs text-blue-600">em rascunho</p>
            </div>
          </button>
        )}
      </div>
    </div>
  );
}
