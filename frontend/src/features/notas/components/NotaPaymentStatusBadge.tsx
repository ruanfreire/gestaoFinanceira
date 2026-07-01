import Badge from "@ui/components/ui/badge/Badge";
import { paymentClass, paymentLabel } from "../utils/nota-display.util";

type NotaPaymentStatusBadgeProps = {
  status?: string;
  valor?: number;
  valorPago?: number;
};

export function NotaPaymentStatusBadge({ status, valor, valorPago }: NotaPaymentStatusBadgeProps) {
  return (
    <span className={`inline-flex px-2 py-0.5 text-xs rounded-full ${paymentClass(status)}`}>
      {paymentLabel(status, valor, valorPago)}
    </span>
  );
}

export function PagamentoSourceBadge({ source }: { source?: string }) {
  if (source === "nubank") {
    return (
      <Badge color="primary" size="sm">
        Nubank
      </Badge>
    );
  }
  return (
    <Badge color="info" size="sm">
      Asaas
    </Badge>
  );
}
