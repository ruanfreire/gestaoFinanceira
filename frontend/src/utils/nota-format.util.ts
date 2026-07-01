export type PagamentoResumo = {
  source?: string;
  lancamento_id?: string;
  valor?: number;
  data?: string;
  pagador_nome?: string;
  descricao?: string;
};

export function formatDate(value?: string) {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "—" : date.toLocaleDateString("pt-BR");
}

export function formatCurrency(value?: number) {
  if (value == null) return "—";
  return Number(value).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export function formatCompetencia(value?: string) {
  if (!value) return "—";
  const [year, month] = value.split("-");
  if (!year || !month) return value;
  return `${month}/${year}`;
}

export function pagamentosResumo(pagamentos?: PagamentoResumo[]) {
  if (!pagamentos?.length) return "—";
  return pagamentos
    .map((p) => {
      const parts = [
        p.source?.toUpperCase(),
        formatDate(p.data),
        p.valor != null ? formatCurrency(p.valor) : null,
      ].filter(Boolean);
      return parts.join(" · ");
    })
    .join(" | ");
}

export function competenciaOffsetLabel(offset: number | null | undefined) {
  if (offset === 0) return "Competência do pagamento";
  if (offset === 1) return "Fatura mês anterior";
  return null;
}
