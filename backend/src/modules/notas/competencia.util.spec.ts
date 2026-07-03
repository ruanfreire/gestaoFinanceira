import { describe, expect, it } from 'vitest';
import {
  competenciaMatchScore,
  competenciaOffsetMonths,
  mesCompetenciaFromDate,
  paymentMatchesCompetencia,
} from './competencia.util';

describe('mesCompetenciaFromDate', () => {
  it('deriva YYYY-MM da data de emissão (UTC)', () => {
    expect(mesCompetenciaFromDate('2026-05-08T12:00:00.000Z')).toBe('2026-05');
    expect(mesCompetenciaFromDate('2026-06-15')).toBe('2026-06');
    expect(mesCompetenciaFromDate('2026-07-01T00:00:00.000Z')).toBe('2026-07');
  });

  it('retorna undefined para data inválida', () => {
    expect(mesCompetenciaFromDate(null)).toBeUndefined();
    expect(mesCompetenciaFromDate('invalid')).toBeUndefined();
  });
});

describe('competenciaOffsetMonths', () => {
  it('offset 0 quando pagamento no mesmo mês da competência', () => {
    const payment = new Date(2026, 5, 2);
    expect(competenciaOffsetMonths(payment, '2026-06')).toBe(0);
  });

  it('offset 1 quando NF de maio paga em junho', () => {
    const payment = new Date(2026, 5, 2);
    expect(competenciaOffsetMonths(payment, '2026-05')).toBe(1);
  });

  it('offset 2 quando pagamento dois meses após competência', () => {
    const payment = new Date(2026, 5, 2);
    expect(competenciaOffsetMonths(payment, '2026-04')).toBe(2);
  });
});

describe('paymentMatchesCompetencia', () => {
  const payment = new Date(2026, 5, 2);

  it('aceita mesmo mês e mês seguinte', () => {
    expect(paymentMatchesCompetencia(payment, '2026-06')).toBe(true);
    expect(paymentMatchesCompetencia(payment, '2026-05')).toBe(true);
  });

  it('rejeita competência muito antiga', () => {
    expect(paymentMatchesCompetencia(payment, '2026-04')).toBe(false);
  });

  it('rejeita pagamento antes da competência', () => {
    const early = new Date(2026, 4, 28);
    expect(paymentMatchesCompetencia(early, '2026-06')).toBe(false);
  });
});

describe('competenciaMatchScore', () => {
  it('bonifica offset 0 mais que offset 1', () => {
    expect(competenciaMatchScore(0)).toBeGreaterThan(competenciaMatchScore(1)!);
    expect(competenciaMatchScore(2)).toBe(0);
  });
});
