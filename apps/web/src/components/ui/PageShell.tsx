import React from 'react';
import { cn } from '../../lib/utils';

interface PageShellProps {
  children: React.ReactNode;
  title?: string;
  subtitle?: string;
  description?: string;
  headerActions?: React.ReactNode;
  className?: string;
}

export function PageShell({
  children,
  title,
  subtitle,
  description,
  headerActions,
  className,
}: PageShellProps) {
  return (
    <div className={cn("flex flex-col gap-6 p-4 md:p-6 max-w-7xl mx-auto w-full", className)}>
      {(title || description || headerActions) && (
        <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="space-y-0.5">
            {title && (
              <h1 className="text-xl font-semibold tracking-tight text-slate-900 leading-snug">
                {title}
              </h1>
            )}
            {subtitle && (
              <p className="text-sm text-slate-500 font-normal">{subtitle}</p>
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
