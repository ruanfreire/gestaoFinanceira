import { Modal } from "@/design-system/organisms/modal/modal";
import { Button, Badge, Typography } from "@/design-system/atoms";
import { PrefetchLink } from "@/design-system/molecules";

export type ImportSummaryCounts = {
  total: number;
  ok: number;
  warning: number;
  failed: number;
  byType?: Record<string, number>;
};

export function ImportSummaryModal({
  open,
  onOpenChange,
  counts,
  onConfirm,
  onChoose,
  loading,
  pendentesHref,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  counts: ImportSummaryCounts;
  onConfirm: () => void;
  onChoose?: () => void;
  loading?: boolean;
  pendentesHref?: string;
}) {
  const typeLines = counts.byType
    ? Object.entries(counts.byType)
        .filter(([, n]) => n > 0)
        .map(([type, n]) => `${n} ${type}`)
    : [];

  const summaryText =
    typeLines.length > 0
      ? `Encontramos ${typeLines.join(", ")}. Importar tudo?`
      : `Encontramos ${counts.total} arquivo(s). Importar tudo?`;

  return (
    <Modal open={open} onOpenChange={onOpenChange} title="Confirmar importação">
      <div className="space-y-4">
        <Typography variant="body">{summaryText}</Typography>

        {counts.total > 0 && (
          <div className="flex flex-wrap gap-2">
            <Badge variant="outline">{counts.total} arquivo(s)</Badge>
          </div>
        )}

        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          {onChoose && (
            <Button type="button" variant="outline" onClick={onChoose} disabled={loading}>
              Escolher
            </Button>
          )}
          <Button type="button" onClick={onConfirm} loading={loading}>
            Sim, importar
          </Button>
        </div>

        {counts.failed > 0 && pendentesHref && (
          <Typography variant="caption" tone="muted">
            Após importar,{" "}
            <PrefetchLink to={pendentesHref} className="font-medium text-primary underline">
              ver pendentes
            </PrefetchLink>
          </Typography>
        )}
      </div>
    </Modal>
  );
}
