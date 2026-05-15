import React from 'react';
import { Users, ClipboardList } from 'lucide-react';

interface KPIGridProps {
  totalPendencias: number;
  turmasComChamadaHoje: number;
  totalTurmasHoje: number;
  diariosEstaSemana: number;
  diariosPublicados: number;
  diariosRascunho: number;
  totalTurmas: number;
  totalAlunos: number;
  totalProfessores: number;
  onPendenciasClick: () => void;
  onChamadasClick: () => void;
  onDiariosClick: () => void;
  onTurmasClick: () => void;
}

/**
 * KPIGrid — 4 cards de indicadores operacionais do dia
 * Visual premium: fundo claro, métricas equilibradas, sem uppercase agressivo
 */
export function KPIGrid({
  totalPendencias,
  turmasComChamadaHoje,
  totalTurmasHoje,
  diariosEstaSemana,
  diariosPublicados,
  diariosRascunho,
  totalTurmas,
  totalAlunos,
  totalProfessores,
  onPendenciasClick,
  onChamadasClick,
  onDiariosClick,
  onTurmasClick,
}: KPIGridProps) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      {/* Pendências */}
      <button
        onClick={onPendenciasClick}
        className="rounded-2xl border border-slate-200 bg-white p-4 text-left hover:border-blue-200 hover:shadow-sm transition-all group"
      >
        <p className="text-[11px] font-medium text-slate-400 mb-1.5 tracking-wide">Pendências</p>
        <p className="text-2xl font-semibold text-slate-800 group-hover:text-blue-600 transition-colors tabular-nums">
          {totalPendencias}
        </p>
        <p className="mt-1 text-xs text-slate-400">planos · pedidos</p>
        <p className="mt-2 text-[10px] text-slate-400 group-hover:text-blue-500 transition-colors">
          Ver planejamentos →
        </p>
      </button>

      {/* Chamadas hoje */}
      <button
        onClick={onChamadasClick}
        className="rounded-2xl border border-slate-200 bg-white p-4 text-left hover:border-emerald-200 hover:shadow-sm transition-all group"
      >
        <p className="text-[11px] font-medium text-slate-400 mb-1.5 tracking-wide">Chamadas hoje</p>
        <p className="text-2xl font-semibold text-slate-800 group-hover:text-emerald-600 transition-colors tabular-nums">
          {totalTurmasHoje > 0
            ? `${Math.round((turmasComChamadaHoje / totalTurmasHoje) * 100)}%`
            : '—'}
        </p>
        <p className="mt-1 text-xs text-slate-400">
          {turmasComChamadaHoje} de {totalTurmasHoje} turmas
        </p>
        <p className="mt-2 text-[10px] text-slate-400 group-hover:text-emerald-500 transition-colors">
          Ver status das turmas →
        </p>
      </button>

      {/* Diários */}
      <button
        onClick={onDiariosClick}
        className="rounded-2xl border border-slate-200 bg-white p-4 text-left hover:border-amber-200 hover:shadow-sm transition-all group"
      >
        <p className="text-[11px] font-medium text-slate-400 mb-1.5 tracking-wide">Diários</p>
        <p className="text-2xl font-semibold text-slate-800 group-hover:text-amber-600 transition-colors tabular-nums">
          {diariosEstaSemana ?? 0}
        </p>
        <p className="mt-1 text-xs text-slate-400">
          {diariosPublicados} publicados · {diariosRascunho} rascunho(s)
        </p>
        <p className="mt-2 text-[10px] text-slate-400 group-hover:text-amber-500 transition-colors">
          Analisar diários →
        </p>
      </button>

      {/* Turmas */}
      <button
        onClick={onTurmasClick}
        className="rounded-2xl border border-slate-200 bg-white p-4 text-left hover:border-violet-200 hover:shadow-sm transition-all group"
      >
        <p className="text-[11px] font-medium text-slate-400 mb-1.5 tracking-wide">Turmas</p>
        <p className="text-2xl font-semibold text-slate-800 group-hover:text-violet-600 transition-colors tabular-nums">
          {totalTurmas ?? 0}
        </p>
        <p className="mt-1 text-xs text-slate-400">
          {totalAlunos ?? 0} alunos · {totalProfessores ?? 0} professores
        </p>
        <p className="mt-2 text-[10px] text-slate-400 group-hover:text-violet-500 transition-colors">
          Ver todas as turmas →
        </p>
      </button>
    </div>
  );
}
