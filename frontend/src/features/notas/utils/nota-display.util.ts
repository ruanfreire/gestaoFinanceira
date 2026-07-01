import { formatCurrency } from "@/utils/nota-format.util";

export function paymentLabel(
  status?: string,
  valor?: number,
  valorPago?: number,
): string {
  if (status === "pago") return "Pago";
  if (status === "parcial" && valorPago != null && valor != null) {
    return `Parcial (${formatCurrency(valorPago)} / ${formatCurrency(valor)})`;
  }
  if (status === "parcial") return "Parcial";
  return "Em aberto";
}

export function paymentClass(status?: string): string {
  if (status === "pago") {
    return "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300";
  }
  if (status === "parcial") {
    return "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300";
  }
  return "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300";
}
