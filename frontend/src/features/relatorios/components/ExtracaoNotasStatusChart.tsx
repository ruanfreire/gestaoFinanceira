import FinanceBarChart from "@ui/components/charts/FinanceBarChart";
import type { NotaExtracao } from "../types/relatorios.types";

type ExtracaoNotasStatusChartProps = {
  items: NotaExtracao[];
};

export function ExtracaoNotasStatusChart({ items }: ExtracaoNotasStatusChartProps) {
  const counts = { em_aberto: 0, parcial: 0, pago: 0, outros: 0 };
  for (const item of items) {
    const s = item.status_pagamento;
    if (s === "em_aberto") counts.em_aberto += 1;
    else if (s === "parcial") counts.parcial += 1;
    else if (s === "pago") counts.pago += 1;
    else counts.outros += 1;
  }

  const categories = ["Em aberto", "Parcial", "Pago", "Outros"];
  const values = [counts.em_aberto, counts.parcial, counts.pago, counts.outros];

  if (values.every((v) => v === 0)) return null;

  return (
    <FinanceBarChart
      categories={categories}
      series={[{ name: "Notas", data: values }]}
      colors={["#f79009", "#465fff", "#12b76a", "#98a2b3"]}
      height={220}
      valueFormatter={(v) => `${Math.round(v)}`}
    />
  );
}
