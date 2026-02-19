import React from 'react';
import { cn } from '../../lib/utils';

interface PageShellProps {
  children: React.ReactNode;
  title?: string;
  description?: string;
  headerActions?: React.ReactNode;
  className?: string;
}

export function PageShell({
  children,
  title,
  description,
  headerActions,
  className,
}: PageShellProps) {
  return (
    <div className={cn("flex flex-col gap-8 p-4 md:p-8 max-w-7xl mx-auto w-full", className)}>
      {(title || description || headerActions) && (
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            {title && <h1 className="text-3xl font-bold tracking-tight">{title}</h1>}
            {description && <p className="text-muted-foreground">{description}</p>}
          </div>
          {headerActions && <div className="flex items-center gap-2">{headerActions}</div>}
        </header>
      )}
      <main className="flex-1">
        {children}
      </main>
    </div>
  );
}
