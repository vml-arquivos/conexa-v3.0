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
 * KPIGrid - 4 cards de indicadores operacionais do dia
 * Fornece drill-down para abas específicas
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
      {/* Pendências → aba planejamentos */}
      <button
        onClick={onPendenciasClick}
        className="rounded-2xl border border-slate-200 bg-slate-900 p-4 text-white text-left hover:bg-slate-800 transition-colors group"
      >
        <p className="text-[11px] font-semibold uppercase tracking-[0.15em] text-slate-400">Pendências</p>
        <p className="mt-1.5 text-3xl font-bold group-hover:text-blue-300 transition-colors">{totalPendencias}</p>
        <p className="mt-1 text-xs text-slate-400">planos · pedidos</p>
        <p className="mt-2 text-[10px] text-slate-500 group-hover:text-slate-300">Ver planejamentos →</p>
      </button>

      {/* Chamadas hoje → aba turmas */}
      <button
        onClick={onChamadasClick}
        className="rounded-2xl border border-slate-200 bg-slate-900 p-4 text-white text-left hover:bg-slate-800 transition-colors group"
      >
        <p className="text-[11px] font-semibold uppercase tracking-[0.15em] text-slate-400">Chamadas hoje</p>
        <p className="mt-1.5 text-3xl font-bold group-hover:text-emerald-300 transition-colors">
          {totalTurmasHoje > 0 ? `${Math.round((turmasComChamadaHoje / totalTurmasHoje) * 100)}%` : '—'}
        </p>
        <p className="mt-1 text-xs text-slate-400">{turmasComChamadaHoje} de {totalTurmasHoje} turmas</p>
        <p className="mt-2 text-[10px] text-slate-500 group-hover:text-slate-300">Ver status das turmas →</p>
      </button>

      {/* Diários → diario-calendario */}
      <button
        onClick={onDiariosClick}
        className="rounded-2xl border border-slate-200 bg-slate-900 p-4 text-white text-left hover:bg-slate-800 transition-colors group"
      >
        <p className="text-[11px] font-semibold uppercase tracking-[0.15em] text-slate-400">Diários</p>
        <p className="mt-1.5 text-3xl font-bold group-hover:text-amber-300 transition-colors">{diariosEstaSemana ?? 0}</p>
        <p className="mt-1 text-xs text-slate-400">{diariosPublicados} publicados · {diariosRascunho} rascunho(s)</p>
        <p className="mt-2 text-[10px] text-slate-500 group-hover:text-slate-300">Analisar diários →</p>
      </button>

      {/* Turmas → aba turmas */}
      <button
        onClick={onTurmasClick}
        className="rounded-2xl border border-slate-200 bg-slate-900 p-4 text-white text-left hover:bg-slate-800 transition-colors group"
      >
        <p className="text-[11px] font-semibold uppercase tracking-[0.15em] text-slate-400">Turmas</p>
        <p className="mt-1.5 text-3xl font-bold group-hover:text-violet-300 transition-colors">{totalTurmas ?? 0}</p>
        <p className="mt-1 text-xs text-slate-400">{totalAlunos ?? 0} alunos · {totalProfessores ?? 0} professores</p>
        <p className="mt-2 text-[10px] text-slate-500 group-hover:text-slate-300">Ver todas as turmas →</p>
      </button>
    </div>
  );
}
