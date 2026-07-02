import Alert from "@ui/components/ui/alert/Alert";
import Button from "@ui/components/ui/button/Button";
import { getApiErrorMessage } from "@/shared/services/api.client";

type QueryErrorAlertProps = {
  error: unknown;
  title?: string;
  fallbackMessage?: string;
  onRetry?: () => void;
  retryLabel?: string;
  className?: string;
};

export function QueryErrorAlert({
  error,
  title = "Erro ao carregar dados",
  fallbackMessage = "Não foi possível carregar os dados.",
  onRetry,
  retryLabel = "Tentar novamente",
  className = "",
}: QueryErrorAlertProps) {
  return (
    <div className={className}>
      <Alert variant="error" title={title} message={getApiErrorMessage(error, fallbackMessage)} />
      {onRetry && (
        <div className="mt-4">
          <Button variant="outline" size="sm" onClick={onRetry}>
            {retryLabel}
          </Button>
        </div>
      )}
    </div>
  );
}
