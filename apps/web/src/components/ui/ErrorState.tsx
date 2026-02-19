import { AlertTriangle, RefreshCcw } from "lucide-react";
import { Button } from "./button";
import { Card, CardContent, CardHeader, CardTitle } from "./card";

interface ErrorStateProps {
  title?: string;
  message?: string;
  onRetry?: () => void;
}

export function ErrorState({ 
  title = "Ocorreu um erro", 
  message = "Não foi possível carregar as informações. Por favor, tente novamente.",
  onRetry 
}: ErrorStateProps) {
  return (
    <Card className="border-destructive/50 bg-destructive/5">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-destructive">
          <AlertTriangle className="h-5 w-5" />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-muted-foreground">{message}</p>
        {onRetry && (
          <Button variant="outline" onClick={onRetry} className="gap-2">
            <RefreshCcw className="h-4 w-4" />
            Tentar Novamente
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
