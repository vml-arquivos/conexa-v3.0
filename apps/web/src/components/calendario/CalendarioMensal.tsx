/**
 * CalendarioMensal — Componente reutilizável de calendário mensal para o Diário da Turma
 *
 * Responsabilidades:
 * - Exibir grade mensal (Dom→Sáb) com navegação entre meses
 * - Colorir células conforme status do evento do dia (publicado/aprovado, rascunho, sem evento)
 * - Destacar o dia de hoje com ring azul
 * - Bloquear clique em dias futuros
 * - Emitir onDiaClick(data, evento?) ao clicar em dias passados/hoje
 */

import { ChevronLeft, ChevronRight } from 'lucide-react';

// ─── Tipos ────────────────────────────────────────────────────────────────────

export interface CalendarioMensalEvento {
  data: string; // 'YYYY-MM-DD'
  status: 'publicado' | 'rascunho' | 'aprovado' | 'em_revisao';
}

export interface CalendarioMensalProps {
  mes: number;           // 0-11
  ano: number;
  eventos: CalendarioMensalEvento[];
  onDiaClick: (data: string, evento?: CalendarioMensalEvento) => void;
  hoje?: string;         // 'YYYY-MM-DD'
  onMesAnterior: () => void;
  onProximoMes: () => void;
}

// ─── Constantes ───────────────────────────────────────────────────────────────

const NOMES_MESES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
];

const DIAS_SEMANA = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Formata número do dia com zero à esquerda → 'YYYY-MM-DD' */
function formatarData(ano: number, mes: number, dia: number): string {
  const mm = String(mes + 1).padStart(2, '0');
  const dd = String(dia).padStart(2, '0');
  return `${ano}-${mm}-${dd}`;
}

/** Retorna o dia da semana (0=Dom) do primeiro dia do mês */
function primeiroDiaSemana(ano: number, mes: number): number {
  return new Date(ano, mes, 1).getDay();
}

/** Retorna o total de dias no mês */
function diasNoMes(ano: number, mes: number): number {
  return new Date(ano, mes + 1, 0).getDate();
}

/** Retorna true se o dia for sábado (6) ou domingo (0) */
function isFimDeSemana(ano: number, mes: number, dia: number): boolean {
  const d = new Date(ano, mes, dia).getDay();
  return d === 0 || d === 6;
}

// ─── Componente ───────────────────────────────────────────────────────────────

export function CalendarioMensal({
  mes,
  ano,
  eventos,
  onDiaClick,
  hoje,
  onMesAnterior,
  onProximoMes,
}: CalendarioMensalProps) {
  // Mapa rápido data → evento
  const eventoMap = new Map<string, CalendarioMensalEvento>();
  for (const ev of eventos) {
    eventoMap.set(ev.data, ev);
  }

  const hojeStr = hoje ?? new Date().toISOString().substring(0, 10);
  const totalDias = diasNoMes(ano, mes);
  const offsetInicio = primeiroDiaSemana(ano, mes);

  // Células da grade: null = célula vazia (offset), número = dia do mês
  const celulas: (number | null)[] = [
    ...Array(offsetInicio).fill(null),
    ...Array.from({ length: totalDias }, (_, i) => i + 1),
  ];

  // Completar até múltiplo de 7 para fechar a última linha
  while (celulas.length % 7 !== 0) celulas.push(null);

  function handleDiaClick(dia: number) {
    const dataStr = formatarData(ano, mes, dia);
    // Bloquear dias futuros
    if (dataStr > hojeStr) return;
    // Bloquear fins de semana (dias não letivos)
    if (isFimDeSemana(ano, mes, dia)) return;
    const evento = eventoMap.get(dataStr);
    onDiaClick(dataStr, evento);
  }

  function getCelulaClasses(dia: number): string {
    const dataStr = formatarData(ano, mes, dia);
    const isFuturo = dataStr > hojeStr;
    const isHoje = dataStr === hojeStr;
    const evento = eventoMap.get(dataStr);
    const temPublicado = evento && (evento.status === 'publicado' || evento.status === 'aprovado');
    const temRascunho = evento && (evento.status === 'rascunho' || evento.status === 'em_revisao');

    let base = 'relative flex flex-col items-center justify-start rounded-xl p-1.5 min-h-[52px] text-sm font-medium transition-all select-none ';

    if (isFuturo || isFimDeSemana(ano, mes, dia)) {
      base += 'bg-gray-50/40 text-gray-200 cursor-not-allowed';
    } else if (temPublicado) {
      base += 'bg-green-50 text-green-700 cursor-pointer hover:bg-green-100';
    } else if (temRascunho) {
      base += 'bg-amber-50 text-amber-700 cursor-pointer hover:bg-amber-100';
    } else {
      base += 'bg-white text-gray-400 cursor-pointer hover:bg-gray-50';
    }

    if (isHoje) {
      base += ' ring-2 ring-blue-500 text-blue-700 font-bold';
    }

    return base;
  }

  function getPonto(dia: number): React.ReactNode {
    const dataStr = formatarData(ano, mes, dia);
    const evento = eventoMap.get(dataStr);
    if (!evento) return null;
    if (evento.status === 'publicado' || evento.status === 'aprovado') {
      return <span className="mt-0.5 h-1.5 w-1.5 rounded-full bg-green-500 flex-shrink-0" />;
    }
    if (evento.status === 'rascunho' || evento.status === 'em_revisao') {
      return <span className="mt-0.5 h-1.5 w-1.5 rounded-full bg-amber-500 flex-shrink-0" />;
    }
    return null;
  }

  return (
    <div className="w-full rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
      {/* ── Cabeçalho ── */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 bg-gray-50/60">
        <button
          type="button"
          onClick={onMesAnterior}
          className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-500 hover:bg-gray-200 transition"
          aria-label="Mês anterior"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>

        <h2 className="text-sm font-bold text-gray-800 tracking-wide">
          {NOMES_MESES[mes]} {ano}
        </h2>

        <button
          type="button"
          onClick={onProximoMes}
          className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-500 hover:bg-gray-200 transition"
          aria-label="Próximo mês"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      {/* ── Grade ── */}
      <div className="p-2">
        {/* Cabeçalho dos dias da semana */}
        <div className="grid grid-cols-7 mb-1">
          {DIAS_SEMANA.map(d => (
            <div key={d} className="text-center text-[10px] font-semibold text-gray-400 uppercase py-1">
              {d}
            </div>
          ))}
        </div>

        {/* Células dos dias */}
        <div className="grid grid-cols-7 gap-1">
          {celulas.map((dia, idx) => {
            if (dia === null) {
              return <div key={`empty-${idx}`} />;
            }
            return (
              <button
                key={dia}
                type="button"
                onClick={() => handleDiaClick(dia)}
                className={getCelulaClasses(dia)}
                disabled={formatarData(ano, mes, dia) > hojeStr || isFimDeSemana(ano, mes, dia)}
                aria-label={`Dia ${dia} de ${NOMES_MESES[mes]}`}
              >
                <span className="leading-none">{dia}</span>
                {getPonto(dia)}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Legenda ── */}
      <div className="flex items-center gap-4 px-4 py-2.5 border-t border-gray-100 bg-gray-50/40 text-xs text-gray-500">
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-green-500" /> Publicado
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-amber-500" /> Rascunho
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-2 w-2 rounded-full ring-2 ring-blue-500 bg-white" /> Hoje
        </span>
      </div>
    </div>
  );
}
