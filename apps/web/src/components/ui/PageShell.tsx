import React from 'react';
import { cn } from '../../lib/utils';

interface PageShellProps {
  children: React.ReactNode;
  title?: string;
  subtitle?: string;
  /** Alias legado usado por algumas páginas antes da padronização para inglês. */
  titulo?: string;
  /** Alias legado usado por algumas páginas antes da padronização para inglês. */
  subtitulo?: string;
  description?: string;
  headerActions?: React.ReactNode;
  className?: string;
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
}: PageShellProps) {
  const resolvedTitle = title ?? titulo;
  const resolvedSubtitle = subtitle ?? subtitulo;

  return (
    <div className={cn("flex flex-col gap-6 p-4 md:p-6 max-w-7xl mx-auto w-full", className)}>
      {(resolvedTitle || resolvedSubtitle || description || headerActions) && (
        <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="space-y-0.5">
            {resolvedTitle && (
              <h1 className="text-xl font-semibold tracking-tight text-slate-900 leading-snug">
                {resolvedTitle}
              </h1>
            )}
            {resolvedSubtitle && (
              <p className="text-sm text-slate-500 font-normal">{resolvedSubtitle}</p>
            )}
            {description && (
              <p className="text-sm text-slate-400 font-normal">{description}</p>
            )}
          </div>
          {headerActions && (
            <div className="flex items-center gap-2 flex-shrink-0">{headerActions}</div>
          )}
        </header>
      )}
      <main className="flex-1">
        {children}
      </main>
    </div>
  );
}
