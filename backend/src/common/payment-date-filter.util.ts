import { buildDateFilter } from './fluxo-caixa-data.util';

export type PaymentDateRangeParams = {
  from?: string;
  to?: string;
  mes_pagamento?: string;
  /** @deprecated use mes_pagamento */
  mes_competencia?: string;
};

export function resolvePaymentDateRange(params: PaymentDateRangeParams): {
  from?: string;
  to?: string;
} {
  const mes = params.mes_pagamento?.trim() || params.mes_competencia?.trim();
  if (mes && /^\d{4}-\d{2}$/.test(mes)) {
    const [year, month] = mes.split('-').map(Number);
    const lastDay = new Date(year, month, 0).getDate();
    return {
      from: `${year}-${String(month).padStart(2, '0')}-01`,
      to: `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`,
    };
  }
  return { from: params.from?.trim(), to: params.to?.trim() };
}

export function buildPaymentDateMongoFilter(from?: string, to?: string) {
  return buildDateFilter(from, to);
}

export function isDateInPaymentRange(
  value: Date | string | undefined | null,
  from?: string,
  to?: string,
): boolean {
  if (!value) return false;
  if (!from && !to) return true;
  const day = new Date(value).toISOString().slice(0, 10);
  if (from && day < from) return false;
  if (to && day > to) return false;
  return true;
}
