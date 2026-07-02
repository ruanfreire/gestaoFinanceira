import { AlertCircle } from "lucide-react";
import { Button, Typography } from "@/design-system/atoms";
import { cn } from "@/design-system/lib/cn";

export function ErrorState({
  title = "Algo deu errado",
  message,
  onRetry,
  className,
}: {
  title?: string;
  message: string;
  onRetry?: () => void;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center gap-3 rounded-xl border border-danger/30 bg-danger-subtle px-6 py-8 text-center",
        className,
      )}
      role="alert"
    >
      <AlertCircle className="h-8 w-8 text-danger" aria-hidden />
      <Typography variant="title" tone="danger">
        {title}
      </Typography>
      <Typography variant="body" tone="muted">
        {message}
      </Typography>
      {onRetry && (
        <Button variant="outline" onClick={onRetry}>
          Tentar novamente
        </Button>
      )}
    </div>
  );
}
