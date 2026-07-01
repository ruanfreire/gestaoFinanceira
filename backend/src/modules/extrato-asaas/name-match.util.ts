import {
  competenciaMatchScore,
  competenciaOffsetMonths,
  mesCompetenciaFromDate,
  paymentMatchesCompetencia,
} from '../notas/competencia.util';

export function normalizeName(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^\w\s]/g, ' ')
    .replace(/\s+/g, ' ');
}

export function nameSimilarity(a: string, b: string): number {
  const left = normalizeName(a);
  const right = normalizeName(b);
  if (!left || !right) return 0;
  if (left === right) return 1;

  if (left.includes(right) || right.includes(left)) {
    return 0.92;
  }

  const leftTokens = new Set(left.split(' ').filter(Boolean));
  const rightTokens = new Set(right.split(' ').filter(Boolean));

  const smaller = leftTokens.size <= rightTokens.size ? leftTokens : rightTokens;
  const larger = leftTokens.size <= rightTokens.size ? rightTokens : leftTokens;
  let subsetMatches = 0;
  for (const token of smaller) {
    if (larger.has(token)) subsetMatches += 1;
  }
  // Tomador abreviado na NF vs nome completo no banco (ex.: "Marta Jeruza Leal" ⊂ "Marta Jeruza Vasconcelos Leal")
  if (subsetMatches === smaller.size && smaller.size >= 2) {
    return Math.max(0.92, subsetMatches / Math.max(leftTokens.size, rightTokens.size));
  }

  let common = 0;
  for (const token of leftTokens) {
    if (rightTokens.has(token)) common += 1;
  }
  return common / Math.max(leftTokens.size, rightTokens.size);
}

export function extractPayerName(descricao: string): string | null {
  const match = descricao.match(/fatura nr\.\s*\d+\s+(.+)$/i);
  return match?.[1]?.trim() || null;
}

export function amountsEqual(a: number, b: number): boolean {
  return Math.abs(Number(a) - Number(b)) < 0.01;
}

export const DATE_MATCH_WINDOW_DAYS = 30;
export const DATE_AUTO_MATCH_WINDOW_DAYS = 45;
export const AUTO_MATCH_MIN_NAME_SCORE = 0.8;

export function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

export function daysBetween(left: Date, right: Date): number {
  const diff = startOfDay(left).getTime() - startOfDay(right).getTime();
  return Math.round(diff / (1000 * 60 * 60 * 24));
}

export function datesAreClose(
  paymentDate: Date,
  emissionDate: Date,
  windowDays = DATE_MATCH_WINDOW_DAYS,
): boolean {
  if (!paymentDate || !emissionDate) return false;
  return Math.abs(daysBetween(paymentDate, emissionDate)) <= windowDays;
}

export type MatchCandidateScore = {
  nameScore: number;
  valueMatch: boolean;
  partialMatch: boolean;
  saldoAberto: number;
  daysDiff: number | null;
  dateClose: boolean;
  mesCompetencia?: string;
  competenciaOffset: number | null;
  competenciaMatch: boolean;
  totalScore: number;
};

export function effectiveValorPago(nota: { valor?: number; valor_pago?: number; status_pagamento?: string }): number {
  if (nota.valor_pago != null && nota.valor_pago > 0) return Number(nota.valor_pago);
  if (nota.status_pagamento === 'pago') return Number(nota.valor ?? 0);
  return 0;
}

export function notaSaldoAberto(nota: { valor?: number; valor_pago?: number; status_pagamento?: string }): number {
  const total = Number(nota.valor ?? 0);
  return Math.max(0, total - effectiveValorPago(nota));
}

export function partialPaymentFits(
  nota: { valor?: number; valor_pago?: number; status_pagamento?: string },
  paymentAmount: number,
): boolean {
  const amount = Number(paymentAmount);
  if (!Number.isFinite(amount) || amount <= 0) return false;
  return amount <= notaSaldoAberto(nota) + 0.01;
}

export function scoreMatchCandidate(
  nota: {
    tomador?: string;
    valor?: number;
    valor_pago?: number;
    status_pagamento?: string;
    data_emissao?: Date | string | null;
    mes_competencia?: string;
  },
  payerName: string,
  valor: number,
  paymentDate: Date,
): MatchCandidateScore {
  const nameScore = nameSimilarity(nota.tomador || '', payerName);
  const saldoAberto = notaSaldoAberto(nota);
  const valueMatch = amountsEqual(nota.valor ?? NaN, valor);
  const partialMatch = !valueMatch && partialPaymentFits(nota, valor);
  const emissionDate = nota.data_emissao ? new Date(nota.data_emissao) : null;
  const daysDiff =
    emissionDate && !Number.isNaN(emissionDate.getTime())
      ? daysBetween(paymentDate, emissionDate)
      : null;
  const dateClose = daysDiff != null ? Math.abs(daysDiff) <= DATE_MATCH_WINDOW_DAYS : false;

  const mesCompetencia = nota.mes_competencia || mesCompetenciaFromDate(emissionDate);
  const competenciaOffset = competenciaOffsetMonths(paymentDate, mesCompetencia);
  const competenciaMatch = paymentMatchesCompetencia(paymentDate, mesCompetencia);

  let totalScore = nameScore * 0.5;
  if (valueMatch) totalScore += 0.35;
  else if (partialMatch) totalScore += 0.28;
  if (dateClose && daysDiff != null) {
    totalScore += 0.15 * (1 - Math.min(Math.abs(daysDiff), DATE_MATCH_WINDOW_DAYS) / DATE_MATCH_WINDOW_DAYS);
  }
  if (competenciaMatch) {
    totalScore += competenciaMatchScore(competenciaOffset);
  }

  return {
    nameScore,
    valueMatch,
    partialMatch,
    saldoAberto,
    daysDiff,
    dateClose,
    mesCompetencia,
    competenciaOffset,
    competenciaMatch,
    totalScore,
  };
}

export type ScoredNotaMatch = MatchCandidateScore & { nota: { _id?: unknown; data_emissao?: Date | string | null } };

/** Quando há várias notas elegíveis, escolhe uma só se o melhor candidato for claramente superior. */
export function pickDominantAutoMatch<T extends ScoredNotaMatch>(eligible: T[]): T['nota'] | null {
  if (eligible.length === 0) return null;
  if (eligible.length === 1) return eligible[0].nota;

  const sorted = [...eligible].sort((a, b) => {
    if (b.totalScore !== a.totalScore) return b.totalScore - a.totalScore;
    const aComp = a.competenciaOffset ?? 99;
    const bComp = b.competenciaOffset ?? 99;
    if (aComp !== bComp) return aComp - bComp;
    return Math.abs(a.daysDiff ?? 999) - Math.abs(b.daysDiff ?? 999);
  });
  const best = sorted[0];
  const second = sorted[1];

  const scoreGap = best.totalScore - second.totalScore;
  if (scoreGap >= 0.1) return best.nota;

  const bestComp = best.competenciaOffset ?? 99;
  const secondComp = second.competenciaOffset ?? 99;
  if (bestComp < secondComp && scoreGap >= 0.04) return best.nota;

  const bestDays = Math.abs(best.daysDiff ?? 999);
  const secondDays = Math.abs(second.daysDiff ?? 999);
  const daysSpread = secondDays - bestDays;

  // Melhor data claramente mais próxima (ex.: 9 vs 22 dias) com score superior
  if (daysSpread >= 10 && scoreGap >= 0.05) return best.nota;

  if (bestDays <= 7 && secondDays >= 14) return best.nota;
  if (bestDays <= 3 && secondDays > 21) return best.nota;

  return null;
}
