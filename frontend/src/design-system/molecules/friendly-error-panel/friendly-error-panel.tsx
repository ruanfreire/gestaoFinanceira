import { useState } from "react";
import { AlertCircle, ChevronDown, RefreshCw } from "lucide-react";
import { Button, Typography } from "@/design-system/atoms";
import { cn } from "@/design-system/lib/cn";

export function FriendlyErrorPanel({
  title = "Não conseguimos ler este arquivo",
  message = "O documento pode estar incompleto ou em um formato que ainda não reconhecemos.",
  technicalDetails,
  onRetry,
  onReplace,
  className,
}: {
  title?: string;
  message?: string;
  technicalDetails?: string | string[];
  onRetry?: () => void;
  onReplace?: () => void;
  className?: string;
}) {
  const [showTechnical, setShowTechnical] = useState(false);
  const details = Array.isArray(technicalDetails) ? technicalDetails : technicalDetails ? [technicalDetails] : [];

  return (
    <div
      className={cn(
        "rounded-xl border border-danger/30 bg-danger-subtle/30 p-5",
        className,
      )}
      role="alert"
    >
      <div className="flex gap-3">
        <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-danger" aria-hidden />
        <div className="min-w-0 flex-1 space-y-3">
          <div>
            <Typography variant="subtitle">{title}</Typography>
            <Typography variant="body" tone="muted" className="mt-1">
              {message}
            </Typography>
          </div>

          <div className="flex flex-wrap gap-2">
            {onRetry && (
              <Button type="button" size="sm" variant="outline" onClick={onRetry}>
                <RefreshCw className="mr-1.5 h-3.5 w-3.5" aria-hidden />
                Tentar corrigir automaticamente
              </Button>
            )}
            {onReplace && (
              <Button type="button" size="sm" onClick={onReplace}>
                Enviar outro arquivo
              </Button>
            )}
          </div>

          {details.length > 0 && (
            <div>
              <button
                type="button"
                className="inline-flex items-center gap-1 text-caption text-muted-foreground hover:text-foreground"
                onClick={() => setShowTechnical((v) => !v)}
                aria-expanded={showTechnical}
              >
                Ver detalhes técnicos
                <ChevronDown className={cn("h-3.5 w-3.5 transition-transform", showTechnical && "rotate-180")} />
              </button>
              {showTechnical && (
                <ul className="mt-2 space-y-1 rounded-lg bg-surface/80 p-3 text-caption font-mono text-muted-foreground">
                  {details.map((d, i) => (
                    <li key={i}>{d}</li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
