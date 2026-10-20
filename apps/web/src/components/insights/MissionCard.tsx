/**
 * MissionCard.tsx — Card reutilizável de missão inteligente
 *
 * Usado em: TeacherDashboard, CoordPedagogica, CoordGeral, Diretor, Nutricionista, Secretaria
 * Cada missão responde: o que, por que, evidência, prioridade, próximo passo, destino.
 *
 * Design 2.0: cores 100% por tokens semânticos (funciona nos temas claro e
 * escuro com contraste AA) e prioridade comunicada por texto + cor, nunca
 * só por cor.
 */

import { useNavigate } from 'react-router-dom';
import { AlertTriangle, ArrowRight, CheckCircle, Info, Zap } from 'lucide-react';

export type MissionPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export interface MissionEvidence {
  source: string;
  sourceId?: string;
  label: string;
  date?: string;
  value?: string | number;
}

export interface Mission {
  id: string;
  type: string;
  title: string;
  description: string;
  priority: MissionPriority;
  profile: string[];
  evidence: MissionEvidence[];
  suggestedAction: string;
  targetRoute?: string;
  requiresHumanReview: true;
  generatedAt: string;
  tenantScope: { mantenedoraId?: string; unitId?: string };
}

export const PRIORITY_CONFIG: Record<MissionPriority, {
  label: string; bg: string; border: string; text: string; dot: string;
}> = {
  CRITICAL: { label: 'Crítico', bg: 'var(--error-bg)',   border: 'var(--error-border)',   text: 'var(--error)',   dot: 'var(--error)' },
  HIGH:     { label: 'Alto',    bg: 'var(--warning-bg)', border: 'var(--warning-border)', text: 'var(--warning)', dot: 'var(--warning-solid)' },
  MEDIUM:   { label: 'Médio',   bg: 'var(--info-bg)',    border: 'var(--info-border)',    text: 'var(--info)',    dot: 'var(--info)' },
  LOW:      { label: 'Baixo',   bg: 'var(--success-bg)', border: 'var(--success-border)', text: 'var(--success)', dot: 'var(--success)' },
};

const TYPE_LABELS: Record<string, string> = {
  ALERTA_OPERACIONAL:       'Alerta',
  RDIC_PENDENTE:            'RDIC',
  BAIXA_FREQUENCIA:         'Frequência',
  OBSERVACAO_DESENVOLVIMENTO: 'Desenvolvimento',
  RESTRICAO_ALIMENTAR_CRITICA: 'Nutrição',
  CRIANCA_SEM_DIARIO:       'Diário',
};

export function MissionCard({ mission, compact = false }: { mission: Mission; compact?: boolean }) {
  const navigate = useNavigate();
  const cfg = PRIORITY_CONFIG[mission.priority];

  return (
    <article
      className="flex flex-col gap-2.5 rounded-ds-xl border"
      style={{
        background: 'var(--surface-card)',
        borderColor: 'var(--border-default)',
        borderLeft: `3px solid ${cfg.dot}`,
        padding: compact ? '10px 12px' : '14px 16px',
        boxShadow: 'var(--shadow-xs)',
      }}
    >
      {/* Cabeçalho */}
      <div className="flex items-start justify-between gap-2">
        <p className="m-0 flex-1 text-[13.5px] font-semibold leading-snug text-[var(--text-primary)]">
          {mission.title}
        </p>
        <div className="flex flex-shrink-0 items-center gap-1">
          <span
            className="rounded-full border px-2 py-0.5 text-[11px] font-semibold"
            style={{ background: cfg.bg, borderColor: cfg.border, color: cfg.text }}
          >
            {cfg.label}
          </span>
          <span className="rounded-full border border-[var(--border-default)] bg-[var(--surface-subtle)] px-2 py-0.5 text-[11px] font-medium text-[var(--text-secondary)]">
            {TYPE_LABELS[mission.type] ?? mission.type}
          </span>
        </div>
      </div>

      {/* Descrição */}
      {!compact && (
        <p className="m-0 text-[13px] leading-relaxed text-[var(--text-secondary)]">
          {mission.description}
        </p>
      )}

      {/* Evidências */}
      {!compact && mission.evidence.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {mission.evidence.map((e, i) => (
            <span
              key={i}
              className="rounded-full border border-[var(--border-default)] bg-[var(--surface-subtle)] px-2 py-0.5 text-[11px] text-[var(--text-secondary)]"
            >
              {e.label}{e.value !== undefined ? `: ${e.value}` : ''}
            </span>
          ))}
        </div>
      )}

      {/* Ação sugerida + botão */}
      <div className="flex items-center justify-between gap-2">
        <p className="m-0 flex-1 text-xs leading-snug text-[var(--text-secondary)]">
          <span className="font-semibold text-[var(--text-primary)]">Sugestão: </span>
          {mission.suggestedAction}
        </p>
        {mission.targetRoute && (
          <button
            onClick={() => navigate(mission.targetRoute!)}
            className="flex flex-shrink-0 items-center gap-1 rounded-lg border border-[var(--border-default)] bg-[var(--surface-base)] px-2.5 py-1.5 text-xs font-semibold text-[var(--text-brand)] transition-colors hover:bg-[var(--surface-brand)]"
          >
            Abrir <ArrowRight size={12} />
          </button>
        )}
      </div>

      {/* Rodapé */}
      <div className="flex items-center gap-1.5 text-[11px] text-[var(--text-tertiary)]">
        <Info size={11} />
        <span>Revisão humana necessária</span>
        <span className="ml-auto tabular-nums">
          {new Date(mission.generatedAt).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
        </span>
      </div>
    </article>
  );
}

// ─── Painel de missões (usado nos dashboards) ─────────────────────────────────
export function MissionPanel({
  missions, loading, error, title = 'Missões', compact = false, maxItems = 5,
}: {
  missions: Mission[];
  loading?: boolean;
  error?: string;
  title?: string;
  compact?: boolean;
  maxItems?: number;
}) {
  const navigate = useNavigate();
  const shown = missions.slice(0, maxItems);
  const criticos = missions.filter((m) => m.priority === 'CRITICAL').length;
  const altos = missions.filter((m) => m.priority === 'HIGH').length;
  const countBg = criticos > 0 ? 'var(--error)' : altos > 0 ? 'var(--warning-solid)' : 'var(--text-tertiary)';

  return (
    <section className="overflow-hidden rounded-ds-xl border border-[var(--border-default)] bg-[var(--surface-card)] shadow-ds-xs">
      {/* Cabeçalho */}
      <div className="flex items-center justify-between border-b border-[var(--border-subtle)] px-4 py-3">
        <div className="flex items-center gap-2">
          <Zap size={16} className="text-[var(--warning-solid)]" />
          <h3 className="m-0 font-display text-sm font-semibold text-[var(--text-primary)]">{title}</h3>
          {missions.length > 0 && (
            <span
              className="rounded-full px-2 py-px text-[11px] font-bold"
              style={{ background: countBg, color: 'var(--surface-card)' }}
            >
              {missions.length}
            </span>
          )}
        </div>
        {missions.length > maxItems && (
          <button
            onClick={() => navigate('/app/inteligencia/missoes')}
            className="border-none bg-transparent text-xs font-semibold text-[var(--text-brand)] hover:underline"
          >
            Ver todas →
          </button>
        )}
      </div>

      {/* Conteúdo */}
      <div className="px-4 py-3">
        {loading && (
          <div className="py-5 text-center text-[13px] text-[var(--text-secondary)]">
            Carregando missões...
          </div>
        )}
        {error && (
          <div role="alert" className="flex gap-2 rounded-lg border border-[var(--error-border)] bg-[var(--error-bg)] p-2.5 text-xs text-[var(--error)]">
            <AlertTriangle size={14} />
            {error}
          </div>
        )}
        {!loading && !error && missions.length === 0 && (
          <div className="py-5 text-center text-[var(--text-secondary)]">
            <CheckCircle size={24} className="mx-auto mb-2 block text-[var(--success)]" />
            <p className="m-0 text-[13px]">Nenhuma missão pendente</p>
          </div>
        )}
        {!loading && !error && shown.length > 0 && (
          <div className="flex flex-col gap-2">
            {shown.map((m) => <MissionCard key={m.id} mission={m} compact={compact} />)}
          </div>
        )}
      </div>
    </section>
  );
}
