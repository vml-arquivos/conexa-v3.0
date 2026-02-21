import { Skeleton } from "./skeleton";
import { Card, CardContent, CardHeader } from "./card";

interface LoadingStateProps {
  message?: string;
}

export function LoadingState({ message }: LoadingStateProps = {}) {
  return (
    <div className="flex flex-col gap-4">
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      <Card className="md:col-span-2">
        <CardHeader>
          <Skeleton className="h-6 w-1/3" />
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-1/2" />
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </CardContent>
      </Card>
    </div>
    {message && (
      <p className="text-sm text-muted-foreground text-center animate-pulse">{message}</p>
    )}
    </div>
  );
}
