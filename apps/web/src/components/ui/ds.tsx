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
        'bg-white border border-slate-100 rounded-2xl shadow-ds-sm',
        padding && 'p-4',
        onClick && 'cursor-pointer hover:border-slate-200 hover:shadow-ds-md transition-all duration-150',
        className,
      )}
    >
      {children}
    </div>
  );
}

// ─── KPI Card premium ─────────────────────────────────────────────────────────
type Tone = 'default' | 'success' | 'warning' | 'danger' | 'info' | 'purple';
const TONE_STYLES: Record<Tone, { bg: string; text: string; sub: string; icon: string }> = {
  default: { bg: 'bg-slate-50',  text: 'text-slate-800', sub: 'text-slate-400', icon: 'text-slate-400' },
  success: { bg: 'bg-emerald-50', text: 'text-emerald-700', sub: 'text-emerald-500', icon: 'text-emerald-500' },
  warning: { bg: 'bg-amber-50',  text: 'text-amber-700',  sub: 'text-amber-500',  icon: 'text-amber-500' },
  danger:  { bg: 'bg-red-50',    text: 'text-red-700',    sub: 'text-red-500',    icon: 'text-red-500' },
  info:    { bg: 'bg-blue-50',   text: 'text-blue-700',   sub: 'text-blue-500',   icon: 'text-blue-500' },
  purple:  { bg: 'bg-purple-50', text: 'text-purple-700', sub: 'text-purple-500', icon: 'text-purple-500' },
};

export function KpiCard({
  label, value, icon, helper, tone = 'default', trend, onClick,
}: {
  label: string; value: string | number; icon: React.ReactNode;
  helper?: string; tone?: Tone; trend?: 'up' | 'down' | 'flat'; onClick?: () => void;
}) {
  const s = TONE_STYLES[tone];
  const TrendIcon = trend === 'up' ? TrendingUp : trend === 'down' ? TrendingDown : Minus;
  return (
    <div
      onClick={onClick}
      className={cn(
        'rounded-2xl p-4 border border-transparent transition-all duration-150',
        s.bg,
        onClick && 'cursor-pointer hover:brightness-95 active:scale-[0.98]',
      )}
    >
      <div className="flex items-center justify-between mb-3">
        <div className={cn('p-2 rounded-xl bg-white/60', s.icon)}>{icon}</div>
        {trend && <TrendIcon className={cn('h-3.5 w-3.5', s.sub)} />}
      </div>
      <p className={cn('text-2xl font-semibold tabular-nums leading-none', s.text)}>{value}</p>
      <p className={cn('text-xs mt-1.5 font-medium', s.sub)}>{label}</p>
      {helper && <p className="text-[11px] text-slate-400 mt-0.5">{helper}</p>}
    </div>
  );
}

// ─── Badge ────────────────────────────────────────────────────────────────────
const BADGE_STYLES: Record<string, string> = {
  success: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  warning: 'bg-amber-100  text-amber-800  border-amber-200',
  danger:  'bg-red-100    text-red-800    border-red-200',
  info:    'bg-blue-100   text-blue-800   border-blue-200',
  purple:  'bg-purple-100 text-purple-800 border-purple-200',
  default: 'bg-slate-100  text-slate-600  border-slate-200',
};
export function Badge({ label, variant = 'default' }: { label: string; variant?: string }) {
  return (
    <span className={cn('inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold border', BADGE_STYLES[variant] ?? BADGE_STYLES.default)}>
      {label}
    </span>
  );
}

// ─── Section header ───────────────────────────────────────────────────────────
export function SectionHeader({
  title, icon, action, badge,
}: { title: string; icon?: React.ReactNode; action?: React.ReactNode; badge?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between mb-3">
      <div className="flex items-center gap-2">
        {icon && <div className="text-slate-400">{icon}</div>}
        <h2 className="text-sm font-semibold text-slate-700">{title}</h2>
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
    <div className="flex gap-1 bg-slate-100 rounded-xl p-1 overflow-x-auto scrollbar-none">
      {tabs.map((t) => (
        <button
          key={t.id}
          onClick={() => onChange(t.id)}
          className={cn(
            'flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium whitespace-nowrap transition-all duration-150',
            active === t.id
              ? 'bg-white text-blue-700 shadow-sm'
              : 'text-slate-500 hover:text-slate-700 hover:bg-white/50',
          )}
        >
          {t.icon}
          {t.label}
          {t.badge != null && t.badge > 0 && (
            <span className="ml-1 min-w-[18px] h-[18px] px-1 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
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
  const COLORS = { blue: 'bg-blue-500', emerald: 'bg-emerald-500', amber: 'bg-amber-500', red: 'bg-red-500', purple: 'bg-purple-500' };
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
        <div className={cn('h-full rounded-full transition-all duration-500', COLORS[color])} style={{ width: `${pct}%` }} />
      </div>
      {showLabel && <span className="text-[11px] text-slate-400 tabular-nums w-8 text-right">{pct}%</span>}
    </div>
  );
}

// ─── Empty state ──────────────────────────────────────────────────────────────
export function EmptyData({ label = 'Sem dados disponíveis' }: { label?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-10 text-center">
      <div className="w-10 h-10 rounded-2xl bg-slate-100 flex items-center justify-center mb-3">
        <Info className="h-5 w-5 text-slate-300" />
      </div>
      <p className="text-sm text-slate-400">{label}</p>
    </div>
  );
}

// ─── Loading skeleton ─────────────────────────────────────────────────────────
export function SkeletonBlock({ className }: { className?: string }) {
  return <div className={cn('bg-slate-100 rounded-xl animate-pulse', className)} />;
}
export function SkeletonGrid({ n = 4, cols = 4 }: { n?: number; cols?: number }) {
  return (
    <div className={cn('grid gap-3', `grid-cols-2 sm:grid-cols-${cols}`)}>
      {Array.from({ length: n }).map((_, i) => <SkeletonBlock key={i} className="h-24" />)}
    </div>
  );
}

// ─── Alert banner ─────────────────────────────────────────────────────────────
export function AlertBanner({ type, children }: { type: 'warning' | 'danger' | 'info' | 'success'; children: React.ReactNode }) {
  const styles = {
    warning: 'bg-amber-50 border-amber-200 text-amber-800',
    danger:  'bg-red-50   border-red-200   text-red-800',
    info:    'bg-blue-50  border-blue-200  text-blue-800',
    success: 'bg-emerald-50 border-emerald-200 text-emerald-800',
  };
  const Icon = type === 'danger' ? AlertTriangle : type === 'success' ? CheckCircle : Info;
  return (
    <div className={cn('flex items-start gap-2.5 p-3 rounded-xl border text-sm', styles[type])}>
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
    <div className="flex items-center justify-between py-2.5 border-b border-slate-50 last:border-0">
      <div className="min-w-0">
        <p className="text-sm text-slate-700 truncate">{label}</p>
        {sub && <p className="text-xs text-slate-400 truncate">{sub}</p>}
      </div>
      <div className="flex items-center gap-2 flex-shrink-0 ml-3">
        <span className="text-sm font-semibold text-slate-800 tabular-nums">{value}</span>
        {action}
      </div>
    </div>
  );
}

// ─── Loading spinner inline ───────────────────────────────────────────────────
export function Spinner({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) {
  const sizes = { sm: 'h-4 w-4', md: 'h-5 w-5', lg: 'h-7 w-7' };
  return <Loader2 className={cn('animate-spin text-slate-300', sizes[size])} />;
}
