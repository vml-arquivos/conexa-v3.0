/**
 * PageShell — Layout base padronizado de todas as páginas do Conexa
 *
 * Uso:
 *   <PageShell title="Título" subtitle="Descrição" headerActions={<button>...</button>}>
 *     conteúdo
 *   </PageShell>
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
      'flex flex-col w-full max-w-[var(--content-max-w)] mx-auto',
      flush ? '' : 'px-4 md:px-6 py-5 gap-5',
      className,
    )}>

      {/* ── Header ── */}
      {(resolvedTitle || resolvedSubtitle || headerActions) && (
        <header className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
          <div className="space-y-0.5 min-w-0">
            {resolvedTitle && (
              <h1 className="text-[1.15rem] font-semibold tracking-tight leading-snug text-[var(--text-primary)] truncate">
                {resolvedTitle}
              </h1>
            )}
            {resolvedSubtitle && (
              <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                {resolvedSubtitle}
              </p>
            )}
          </div>
          {headerActions && (
            <div className="flex items-center gap-2 flex-shrink-0 mt-0.5">
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
