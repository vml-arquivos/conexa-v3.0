/**
 * PageShell — Layout base padronizado de todas as páginas do Conexa
 *
 * Uso:
 *   <PageShell title="Título" subtitle="Descrição" headerActions={<button>...</button>}>
 *     conteúdo
 *   </PageShell>
 *
 * Design 2.0: título em fonte de exibição, subtítulo com contraste AA,
 * mais respiro vertical e entrada suave do conteúdo.
 */

import React from 'react';
import { cn } from '../../lib/utils';

interface PageShellProps {
  children: React.ReactNode;
  title?: string;
  subtitle?: string;
  titulo?: string;
  subtitulo?: string;
  description?: string;
  headerActions?: React.ReactNode;
  className?: string;
  /** Remove o padding horizontal/vertical para conteúdos full-bleed */
  flush?: boolean;
}

export function PageShell({
  children,
  title,
  subtitle,
  titulo,
  subtitulo,
  description,
  headerActions,
  className,
  flush = false,
}: PageShellProps) {
  const resolvedTitle    = title ?? titulo;
  const resolvedSubtitle = subtitle ?? subtitulo ?? description;

  return (
    <div className={cn(
      'flex flex-col w-full max-w-[var(--content-max-w)] mx-auto animate-ds-rise',
      flush ? '' : 'px-4 sm:px-6 lg:px-8 py-6 gap-6',
      className,
    )}>

      {/* ── Header ── */}
      {(resolvedTitle || resolvedSubtitle || headerActions) && (
        <header className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 sm:gap-6">
          <div className="space-y-1 min-w-0">
            {resolvedTitle && (
              <h1 className="font-display text-[1.5rem] sm:text-[1.75rem] font-bold tracking-[-0.03em] leading-tight text-[var(--text-primary)]">
                {resolvedTitle}
              </h1>
            )}
            {resolvedSubtitle && (
              <p className="text-sm text-[var(--text-secondary)] leading-relaxed max-w-3xl">
                {resolvedSubtitle}
              </p>
            )}
          </div>
          {headerActions && (
            <div className="flex flex-wrap items-center gap-2 flex-shrink-0">
              {headerActions}
            </div>
          )}
        </header>
      )}

      {/* ── Content ── */}
      <main className="flex-1 min-w-0">
        {children}
      </main>
    </div>
  );
}
