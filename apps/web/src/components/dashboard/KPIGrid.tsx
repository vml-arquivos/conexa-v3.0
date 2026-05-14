import React from 'react';
import { Users, ClipboardList, BookOpen, AlertCircle } from 'lucide-react';

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
 * Cada card tem accent de cor distinto para facilitar leitura rápida.
 * Fornece drill-down para abas específicas ao clicar.
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
  const taxaChamada = totalTurmasHoje > 0
    ? Math.round((turmasComChamadaHoje / totalTurmasHoje) * 100)
    : 0;

  const cards = [
    {
      id: 'pendencias',
      label: 'Pendências',
      value: totalPendencias,
      sub: 'planos + pedidos',
      cta: 'Ver planejamentos',
      icon: <AlertCircle className="h-4 w-4" />,
      accent: 'text-rose-300',
      dot: 'bg-rose-500',
      border: totalPendencias > 0 ? 'border-rose-500/30' : 'border-slate-700',
      bg: totalPendencias > 0 ? 'bg-rose-950/40' : 'bg-slate-900',
      onClick: onPendenciasClick,
    },
    {
      id: 'chamadas',
      label: 'Chamadas hoje',
      value: totalTurmasHoje > 0 ? `${taxaChamada}%` : '—',
      sub: `${turmasComChamadaHoje} de ${totalTurmasHoje} turmas`,
      cta: 'Ver status das turmas',
      icon: <Users className="h-4 w-4" />,
      accent: taxaChamada >= 70 ? 'text-emerald-300' : taxaChamada >= 40 ? 'text-amber-300' : 'text-rose-300',
      dot: taxaChamada >= 70 ? 'bg-emerald-500' : taxaChamada >= 40 ? 'bg-amber-500' : 'bg-rose-500',
      border: 'border-slate-700',
      bg: 'bg-slate-900',
      onClick: onChamadasClick,
    },
    {
      id: 'diarios',
      label: 'Diários',
      value: diariosEstaSemana ?? 0,
      sub: `${diariosPublicados} publicados · ${diariosRascunho} rascunho(s)`,
      cta: 'Analisar diários',
      icon: <ClipboardList className="h-4 w-4" />,
      accent: 'text-amber-300',
      dot: 'bg-amber-500',
      border: 'border-slate-700',
      bg: 'bg-slate-900',
      onClick: onDiariosClick,
    },
    {
      id: 'turmas',
      label: 'Turmas',
      value: totalTurmas ?? 0,
      sub: `${totalAlunos ?? 0} alunos · ${totalProfessores ?? 0} prof.`,
      cta: 'Ver todas as turmas',
      icon: <BookOpen className="h-4 w-4" />,
      accent: 'text-violet-300',
      dot: 'bg-violet-500',
      border: 'border-slate-700',
      bg: 'bg-slate-900',
      onClick: onTurmasClick,
    },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      {cards.map((card) => (
        <button
          key={card.id}
          onClick={card.onClick}
          className={`relative rounded-2xl border ${card.border} ${card.bg} p-4 text-white text-left
            hover:brightness-110 transition-all duration-200 group`}
        >
          {/* Dot de status */}
          <span className={`absolute top-3.5 right-3.5 w-2 h-2 rounded-full ${card.dot} opacity-70`} />

          {/* Ícone + label */}
          <div className="flex items-center gap-1.5 mb-2">
            <span className="opacity-40 text-slate-300">{card.icon}</span>
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-400 leading-none">
              {card.label}
            </p>
          </div>

          {/* Valor principal */}
          <p className={`text-3xl font-bold ${card.accent} transition-colors`}>
            {card.value}
          </p>

          {/* Sub-label */}
          <p className="mt-1 text-xs text-slate-500 leading-snug">{card.sub}</p>

          {/* CTA */}
          <p className="mt-2.5 text-[10px] text-slate-600 group-hover:text-slate-300 transition-colors">
            {card.cta} →
          </p>
        </button>
      ))}
    </div>
  );
}
