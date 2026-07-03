const currencyFormatter = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

export function formatMoney(value?: number | null): string {
  if (value == null || Number.isNaN(value)) return "—";
  return currencyFormatter.format(value);
}

export function formatDate(value?: string | Date | null): string {
  if (!value) return "—";
  const date = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("pt-BR");
}

export function formatDateTime(value?: string | Date | null): string {
  if (!value) return "—";
  const date = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString("pt-BR");
}

export function formatCompetencia(value?: string | null): string {
  if (!value) return "—";
  const [year, month] = value.split("-");
  if (!year || !month) return value;
  const months = [
    "Jan", "Fev", "Mar", "Abr", "Mai", "Jun",
    "Jul", "Ago", "Set", "Out", "Nov", "Dez",
  ];
  const idx = Number.parseInt(month, 10) - 1;
  return `${months[idx] ?? month}/${year}`;
}

export function parseBrCurrency(value: string): number {
  const normalized = value.replace(/\./g, "").replace(",", ".").trim();
  return Number.parseFloat(normalized);
}

export function currentMesPagamento(): string {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  return `${now.getFullYear()}-${month}`;
}

export function currentMonthDateRange(): { from: string; to: string } {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const lastDay = new Date(year, now.getMonth() + 1, 0).getDate();
  return {
    from: `${year}-${month}-01`,
    to: `${year}-${month}-${String(lastDay).padStart(2, "0")}`,
  };
}

export type PagamentoResumo = {
  source?: "bank";
  lancamento_id?: string;
  valor?: number;
  data?: string;
  descricao?: string;
  pagador_nome?: string;
};

export function paymentStatusLabel(status?: string): string {
  if (status === "pago") return "Pago";
  if (status === "parcial") return "Parcial";
  if (status === "em_aberto") return "Em aberto";
  return status ?? "—";
}

export function bancoLabel(banco: string, bancoLabelFromApi?: string): string {
  if (bancoLabelFromApi?.trim()) return bancoLabelFromApi.trim();
  if (banco === "bank") return "Banco";
  return banco;
}
