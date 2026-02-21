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
  icon = <Inbox className="h-10 w-10 text-muted-foreground/50" />,
  title,
  description,
  action,
}: EmptyStateProps) {
  const displayTitle = title || message || 'Nenhum dado encontrado.';
  return (
    <Card className="border-dashed">
      <CardContent className="flex flex-col items-center justify-center py-12 space-y-4 text-center">
        {icon}
        <div className="space-y-1">
          <p className="text-muted-foreground font-medium">{displayTitle}</p>
          {description && <p className="text-sm text-muted-foreground/70">{description}</p>}
        </div>
        {action && <div>{action}</div>}
      </CardContent>
    </Card>
  );
}
