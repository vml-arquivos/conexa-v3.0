/**
 * ds.tsx — Design System Unificado do Conexa
 *
 * Componentes premium reutilizáveis para todos os painéis.
 * Identidade visual única: limpa, precisa, sem ornamento desnecessário.
 *
 * Uso: import { Card, KpiCard, StatRow, Badge, SectionHeader, TabBar, EmptyData } from '@/components/ui/ds'
 */

import React from 'react';
import { cn } from '../../lib/utils';
import { Loader2, AlertTriangle, CheckCircle, Info, TrendingUp, TrendingDown, Minus } from 'lucide-react';

// ─── Card base ────────────────────────────────────────────────────────────────
export function Card({
  children, className, onClick, padding = true,
}: { children: React.ReactNode; className?: string; onClick?: () => void; padding?: boolean }) {
  return (
    <div
      onClick={onClick}
      className={cn(
        'bg-[var(--surface-card)] text-[var(--text-primary)] border border-[var(--border-default)] rounded-ds-xl shadow-ds-xs',
        padding && 'p-4 sm:p-5',
        onClick && 'cursor-pointer hover:border-[var(--border-strong)] hover:shadow-ds-md transition-[border-color,box-shadow,transform] duration-150 hover:-translate-y-px',
        className,
      )}
    >
      {children}
    </div>
  );
}

// ─── KPI Card premium ─────────────────────────────────────────────────────────
type Tone = 'default' | 'success' | 'warning' | 'danger' | 'info' | 'purple';
// Tons semânticos: fundo e texto vêm dos tokens, então funcionam nos dois temas.
const TONE_STYLES: Record<Tone, { bg: string; text: string; sub: string; icon: string }> = {
  default: { bg: 'bg-[var(--surface-card)] border-[var(--border-default)]', text: 'text-[var(--text-primary)]', sub: 'text-[var(--text-secondary)]', icon: 'bg-[var(--surface-subtle)] text-[var(--text-secondary)]' },
  success: { bg: 'bg-[var(--surface-card)] border-[var(--border-default)]', text: 'text-[var(--text-primary)]', sub: 'text-[var(--text-secondary)]', icon: 'bg-[var(--success-bg)] text-[var(--success)]' },
  warning: { bg: 'bg-[var(--surface-card)] border-[var(--border-default)]', text: 'text-[var(--text-primary)]', sub: 'text-[var(--text-secondary)]', icon: 'bg-[var(--warning-bg)] text-[var(--warning)]' },
  danger:  { bg: 'bg-[var(--surface-card)] border-[var(--border-default)]', text: 'text-[var(--text-primary)]', sub: 'text-[var(--text-secondary)]', icon: 'bg-[var(--error-bg)] text-[var(--error)]' },
  info:    { bg: 'bg-[var(--surface-card)] border-[var(--border-default)]', text: 'text-[var(--text-primary)]', sub: 'text-[var(--text-secondary)]', icon: 'bg-[var(--info-bg)] text-[var(--info)]' },
  purple:  { bg: 'bg-[var(--surface-card)] border-[var(--border-default)]', text: 'text-[var(--text-primary)]', sub: 'text-[var(--text-secondary)]', icon: 'bg-[var(--surface-brand)] text-[var(--text-brand)]' },
};

export function KpiCard({
  label, value, icon, helper, tone = 'default', trend, onClick,
}: {
  label: string; value: string | number; icon: React.ReactNode;
  helper?: string; tone?: Tone; trend?: 'up' | 'down' | 'flat'; onClick?: () => void;
}) {
  const s = TONE_STYLES[tone];
  const TrendIcon = trend === 'up' ? TrendingUp : trend === 'down' ? TrendingDown : Minus;
  const trendColor = trend === 'up' ? 'text-[var(--success)]' : trend === 'down' ? 'text-[var(--error)]' : 'text-[var(--text-tertiary)]';
  return (
    <div
      onClick={onClick}
      className={cn(
        'rounded-ds-xl p-4 sm:p-5 border shadow-ds-xs transition-[border-color,box-shadow,transform] duration-150',
        s.bg,
        onClick && 'cursor-pointer hover:border-[var(--border-strong)] hover:shadow-ds-md hover:-translate-y-px active:scale-[0.99]',
      )}
    >
      <div className="flex items-center justify-between mb-3.5">
        <div className={cn('inline-flex h-9 w-9 items-center justify-center rounded-ds-lg', s.icon)}>{icon}</div>
        {trend && <TrendIcon className={cn('h-4 w-4', trendColor)} />}
      </div>
      <p className={cn('font-display text-[1.75rem] font-bold tabular-nums leading-none tracking-tight', s.text)}>{value}</p>
      <p className={cn('text-[13px] mt-2 font-medium', s.sub)}>{label}</p>
      {helper && <p className="text-xs text-[var(--text-tertiary)] mt-0.5">{helper}</p>}
    </div>
  );
}

// ─── Badge ────────────────────────────────────────────────────────────────────
const BADGE_STYLES: Record<string, string> = {
  success: 'bg-[var(--success-bg)] text-[var(--success)] border-[var(--success-border)]',
  warning: 'bg-[var(--warning-bg)] text-[var(--warning)] border-[var(--warning-border)]',
  danger:  'bg-[var(--error-bg)] text-[var(--error)] border-[var(--error-border)]',
  info:    'bg-[var(--info-bg)] text-[var(--info)] border-[var(--info-border)]',
  purple:  'bg-[var(--surface-brand)] text-[var(--text-brand)] border-[var(--border-brand)]',
  default: 'bg-[var(--surface-subtle)] text-[var(--text-secondary)] border-[var(--border-default)]',
};
export function Badge({ label, variant = 'default' }: { label: string; variant?: string }) {
  return (
    <span className={cn('inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border', BADGE_STYLES[variant] ?? BADGE_STYLES.default)}>
      {label}
    </span>
  );
}

// ─── Section header ───────────────────────────────────────────────────────────
export function SectionHeader({
  title, icon, action, badge,
}: { title: string; icon?: React.ReactNode; action?: React.ReactNode; badge?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between mb-3.5">
      <div className="flex items-center gap-2 min-w-0">
        {icon && <div className="text-[var(--text-tertiary)] flex-shrink-0">{icon}</div>}
        <h2 className="font-display text-[15px] font-semibold tracking-tight text-[var(--text-primary)] truncate">{title}</h2>
        {badge}
      </div>
      {action}
    </div>
  );
}

// ─── Tab bar ─────────────────────────────────────────────────────────────────
export function TabBar<T extends string>({
  tabs, active, onChange, extra,
}: {
  tabs: Array<{ id: T; label: string; icon?: React.ReactNode; badge?: number }>;
  active: T; onChange: (id: T) => void; extra?: React.ReactNode;
}) {
  return (
    <div className="flex gap-1 bg-[var(--surface-subtle)] border border-[var(--border-default)] rounded-ds-xl p-1 overflow-x-auto scrollbar-none">
      {tabs.map((t) => (
        <button
          key={t.id}
          onClick={() => onChange(t.id)}
          aria-pressed={active === t.id}
          className={cn(
            'flex items-center gap-1.5 px-3.5 py-2 rounded-ds-lg text-[13px] font-medium whitespace-nowrap transition-all duration-150',
            active === t.id
              ? 'bg-[var(--surface-base)] text-[var(--text-brand)] shadow-ds-sm'
              : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-muted)]',
          )}
        >
          {t.icon}
          {t.label}
          {t.badge != null && t.badge > 0 && (
            <span className="ml-1 min-w-[18px] h-[18px] px-1 bg-[var(--error)] text-[var(--destructive-foreground)] text-[10px] font-bold rounded-full flex items-center justify-center">
              {t.badge}
            </span>
          )}
        </button>
      ))}
      {extra && <div className="ml-auto">{extra}</div>}
    </div>
  );
}

// ─── Barra de progresso ───────────────────────────────────────────────────────
export function ProgressBar({ value, max = 100, color = 'blue', showLabel = true }: {
  value: number; max?: number; color?: 'blue' | 'emerald' | 'amber' | 'red' | 'purple'; showLabel?: boolean;
}) {
  const pct = Math.min(100, Math.round((value / max) * 100));
  const COLORS = {
    blue: 'bg-[var(--brand-500)]',
    emerald: 'bg-[var(--success)]',
    amber: 'bg-[var(--warning-solid)]',
    red: 'bg-[var(--error)]',
    purple: 'bg-[var(--brand-500)]',
  };
  return (
    <div className="flex items-center gap-2" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
      <div className="flex-1 h-2 bg-[var(--surface-muted)] rounded-full overflow-hidden">
        <div className={cn('h-full rounded-full transition-all duration-500', COLORS[color])} style={{ width: `${pct}%` }} />
      </div>
      {showLabel && <span className="text-xs text-[var(--text-secondary)] tabular-nums w-9 text-right">{pct}%</span>}
    </div>
  );
}

// ─── Empty state ──────────────────────────────────────────────────────────────
export function EmptyData({ label = 'Sem dados disponíveis' }: { label?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-10 text-center">
      <div className="w-11 h-11 rounded-ds-xl bg-[var(--surface-subtle)] flex items-center justify-center mb-3">
        <Info className="h-5 w-5 text-[var(--text-tertiary)]" />
      </div>
      <p className="text-sm text-[var(--text-secondary)]">{label}</p>
    </div>
  );
}

// ─── Loading skeleton ─────────────────────────────────────────────────────────
export function SkeletonBlock({ className }: { className?: string }) {
  return <div className={cn('ds-skeleton rounded-ds-xl', className)} />;
}
const GRID_COLS: Record<number, string> = {
  2: 'sm:grid-cols-2', 3: 'sm:grid-cols-3', 4: 'sm:grid-cols-4', 5: 'sm:grid-cols-5', 6: 'sm:grid-cols-6',
};
export function SkeletonGrid({ n = 4, cols = 4 }: { n?: number; cols?: number }) {
  return (
    <div className={cn('grid gap-3 grid-cols-2', GRID_COLS[cols] ?? 'sm:grid-cols-4')}>
      {Array.from({ length: n }).map((_, i) => <SkeletonBlock key={i} className="h-24" />)}
    </div>
  );
}

// ─── Alert banner ─────────────────────────────────────────────────────────────
export function AlertBanner({ type, children }: { type: 'warning' | 'danger' | 'info' | 'success'; children: React.ReactNode }) {
  const styles = {
    warning: 'bg-[var(--warning-bg)] border-[var(--warning-border)] text-[var(--warning)]',
    danger:  'bg-[var(--error-bg)] border-[var(--error-border)] text-[var(--error)]',
    info:    'bg-[var(--info-bg)] border-[var(--info-border)] text-[var(--info)]',
    success: 'bg-[var(--success-bg)] border-[var(--success-border)] text-[var(--success)]',
  };
  const Icon = type === 'danger' ? AlertTriangle : type === 'success' ? CheckCircle : Info;
  return (
    <div role={type === 'danger' ? 'alert' : 'status'} className={cn('flex items-start gap-2.5 p-3.5 rounded-ds-xl border text-sm leading-relaxed', styles[type])}>
      <Icon className="h-4 w-4 flex-shrink-0 mt-0.5" />
      <div>{children}</div>
    </div>
  );
}

// ─── Stat row (linha horizontal de dado) ─────────────────────────────────────
export function StatRow({ label, value, sub, action }: {
  label: string; value: string | number; sub?: string; action?: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between py-3 border-b border-[var(--border-subtle)] last:border-0">
      <div className="min-w-0">
        <p className="text-sm text-[var(--text-primary)] truncate">{label}</p>
        {sub && <p className="text-xs text-[var(--text-tertiary)] truncate">{sub}</p>}
      </div>
      <div className="flex items-center gap-2 flex-shrink-0 ml-3">
        <span className="text-sm font-semibold text-[var(--text-primary)] tabular-nums">{value}</span>
        {action}
      </div>
    </div>
  );
}

// ─── Loading spinner inline ───────────────────────────────────────────────────
export function Spinner({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) {
  const sizes = { sm: 'h-4 w-4', md: 'h-5 w-5', lg: 'h-7 w-7' };
  return <Loader2 className={cn('animate-spin text-[var(--text-tertiary)]', sizes[size])} />;
}
