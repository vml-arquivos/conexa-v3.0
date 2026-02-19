import { Inbox } from "lucide-react";
import { Card, CardContent } from "./card";

interface EmptyStateProps {
  message?: string;
  icon?: React.ReactNode;
}

export function EmptyState({ 
  message = "Nenhum dado encontrado.",
  icon = <Inbox className="h-10 w-10 text-muted-foreground/50" />
}: EmptyStateProps) {
  return (
    <Card className="border-dashed">
      <CardContent className="flex flex-col items-center justify-center py-12 space-y-4">
        {icon}
        <p className="text-muted-foreground font-medium">{message}</p>
      </CardContent>
    </Card>
  );
}
