import { Inbox } from "lucide-react";
import { Card, CardContent } from "./card";

interface EmptyStateProps {
  message?: string;
  icon?: React.ReactNode;
  title?: string;
  description?: string;
  action?: React.ReactNode;
}

export function EmptyState({
  message,
  icon = <span className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--surface-subtle)]"><Inbox className="h-7 w-7 text-[var(--text-tertiary)]" /></span>,
  title,
  description,
  action,
}: EmptyStateProps) {
  const displayTitle = title || message || 'Nenhum dado encontrado.';
  return (
    <Card className="border-dashed bg-[var(--surface-inset)] shadow-none">
      <CardContent className="flex flex-col items-center justify-center py-12 space-y-4 text-center">
        {icon}
        <div className="space-y-1">
          <p className="font-display text-base font-semibold text-[var(--text-primary)]">{displayTitle}</p>
          {description && <p className="text-sm text-[var(--text-secondary)] max-w-md mx-auto">{description}</p>}
        </div>
        {action && <div>{action}</div>}
      </CardContent>
    </Card>
  );
}
