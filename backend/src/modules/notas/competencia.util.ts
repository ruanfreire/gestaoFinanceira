/** Mês de competência da fatura (YYYY-MM), derivado da data de emissão. */
export function mesCompetenciaFromDate(date: Date | string | null | undefined): string | undefined {
  if (!date) return undefined;
  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) return undefined;
  const year = parsed.getFullYear();
  const month = String(parsed.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
}

export function parseMesCompetencia(value?: string): { year: number; month: number } | null {
  if (!value?.trim()) return null;
  const match = value.trim().match(/^(\d{4})-(\d{2})$/);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  if (!Number.isFinite(year) || month < 1 || month > 12) return null;
  return { year, month };
}

/** Diferença em meses: pagamento − competência (0 = mesmo mês, 1 = pago no mês seguinte). */
export function competenciaOffsetMonths(paymentDate: Date, mesCompetencia?: string): number | null {
  const competencia = parseMesCompetencia(mesCompetencia);
  if (!competencia) return null;
  const payment = new Date(paymentDate);
  if (Number.isNaN(payment.getTime())) return null;
  return (
    (payment.getFullYear() - competencia.year) * 12 + (payment.getMonth() + 1 - competencia.month)
  );
}

/**
 * Pagamento compatível com a fatura do mês:
 * - mesmo mês da competência, ou
 * - mês seguinte (NF emitida em maio, paga em junho).
 */
export function paymentMatchesCompetencia(
  paymentDate: Date,
  mesCompetencia?: string,
  maxOffsetMonths = 1,
): boolean {
  const offset = competenciaOffsetMonths(paymentDate, mesCompetencia);
  if (offset == null) return false;
  return offset >= 0 && offset <= maxOffsetMonths;
}

export function competenciaMatchScore(offset: number | null): number {
  if (offset == null) return 0;
  if (offset === 0) return 0.12;
  if (offset === 1) return 0.06;
  return 0;
}
