import React from 'react';
import { Users, MessageCircle, ShoppingCart } from 'lucide-react';
import { TurmasStatusToday } from './TurmasStatusToday';
import { AtalhosExecutivos } from './AtalhosExecutivos';

interface ModuloVisao360TurmaProps {
  // KPI props
  turmasComChamadaHoje: number;
  totalTurmasHoje: number;
  totalTurmas: number;
  totalAlunos: number;
  totalProfessores: number;
  
  // Turmas status
  turmasLista: any[];
  
  // Atalhos
  atalhosVisao360: any[];
  
  // Ações pendentes
  requisicoesParaAnalisar: number;
  
  // Handlers
  onChamadasClick: () => void;
  onTurmasClick: () => void;
  onViewAllTurmasClick: () => void;
  onAtalhoClick: (atalho: any) => void;
  onRequisicoesClick: () => void;
}

/**
 * ModuloVisao360Turma - Módulo 2: Visão 360° da Turma
 * Agrupa KPIs, status de turmas e ações relacionadas ao acompanhamento geral
 */
export function ModuloVisao360Turma({
  turmasComChamadaHoje,
  totalTurmasHoje,
  totalTurmas,
  totalAlunos,
  totalProfessores,
  turmasLista,
  atalhosVisao360,
  requisicoesParaAnalisar,
  onChamadasClick,
  onTurmasClick,
  onViewAllTurmasClick,
  onAtalhoClick,
  onRequisicoesClick,
}: ModuloVisao360TurmaProps) {
  return (
    <div className="space-y-4">
      {/* Heading do módulo */}
      <div className="flex items-center gap-2 mb-4">
        <div className="w-1 h-6 bg-emerald-600 rounded-full" />
        <h2 className="text-lg font-bold text-gray-900">Visão 360° da Turma</h2>
        <p className="text-sm text-gray-500 ml-auto">Acompanhamento geral e saúde da turma</p>
      </div>

      {/* KPI: Chamadas Hoje + Turmas */}
      <div className="grid grid-cols-2 sm:grid-cols-2 gap-3">
        {/* Chamadas Hoje */}
        <button
          onClick={onChamadasClick}
          className="rounded-2xl border border-slate-200 bg-slate-900 p-4 text-white text-left hover:bg-slate-800 transition-colors group"
        >
          <p className="text-[11px] font-semibold uppercase tracking-[0.15em] text-slate-400">Chamadas hoje</p>
          <p className="mt-1.5 text-3xl font-bold group-hover:text-emerald-300 transition-colors">
            {totalTurmasHoje > 0 ? `${Math.round((turmasComChamadaHoje / totalTurmasHoje) * 100)}%` : '—'}
          </p>
          <p className="mt-1 text-xs text-slate-400">{turmasComChamadaHoje} de {totalTurmasHoje} turmas</p>
          <p className="mt-2 text-[10px] text-slate-500 group-hover:text-slate-300">Ver status →</p>
        </button>

        {/* Turmas */}
        <button
          onClick={onTurmasClick}
          className="rounded-2xl border border-slate-200 bg-slate-900 p-4 text-white text-left hover:bg-slate-800 transition-colors group"
        >
          <p className="text-[11px] font-semibold uppercase tracking-[0.15em] text-slate-400">Turmas</p>
          <p className="mt-1.5 text-3xl font-bold group-hover:text-violet-300 transition-colors">{totalTurmas ?? 0}</p>
          <p className="mt-1 text-xs text-slate-400">{totalAlunos ?? 0} alunos · {totalProfessores ?? 0} profs</p>
          <p className="mt-2 text-[10px] text-slate-500 group-hover:text-slate-300">Ver todas →</p>
        </button>
      </div>

      {/* Atalho: Atendimentos Pais */}
      <AtalhosExecutivos items={atalhosVisao360} />

      {/* Status das turmas hoje */}
      <TurmasStatusToday
        turmas={turmasLista ?? []}
        onViewAllClick={onViewAllTurmasClick}
      />

      {/* Ações pendentes */}
      {requisicoesParaAnalisar > 0 && (
        <button
          onClick={onRequisicoesClick}
          className="flex items-center gap-3 p-4 bg-rose-50 border-2 border-rose-200 rounded-2xl text-left hover:bg-rose-100 transition-all w-full"
        >
          <span className="w-10 h-10 bg-rose-500 text-white rounded-xl flex items-center justify-center text-lg font-bold flex-shrink-0">
            {requisicoesParaAnalisar}
          </span>
          <div>
            <p className="text-sm font-bold text-rose-800">Requisições de Material</p>
            <p className="text-xs text-rose-600">aguardando aprovação</p>
          </div>
        </button>
      )}
    </div>
  );
}
