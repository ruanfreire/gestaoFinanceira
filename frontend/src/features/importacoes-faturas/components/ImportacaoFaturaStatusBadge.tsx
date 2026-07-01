import Badge from "@ui/components/ui/badge/Badge";
import { statusBadgeColor, statusLabel } from "../utils/importacao-display.util";

export function ImportacaoFaturaStatusBadge({ status }: { status?: string }) {
  return (
    <Badge color={statusBadgeColor(status)} size="sm">
      {statusLabel(status)}
    </Badge>
  );
}
