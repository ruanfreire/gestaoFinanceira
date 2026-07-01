import { describe, expect, it } from 'vitest';
import {
  netMovimento,
  resolveSaldoReferenceDate,
  saldoAnteriorFromLancamento,
  sumNetMovimentos,
} from './fluxo-caixa-saldo.util';

describe('fluxo-caixa-saldo.util', () => {
  it('calcula saldo anterior a partir do saldo pós-lançamento Asaas', () => {
    expect(
      saldoAnteriorFromLancamento({
        saldo: 1500,
        valor: 500,
        tipo_movimento: 'entrada',
      }),
    ).toBe(1000);

    expect(
      saldoAnteriorFromLancamento({
        saldo: 800,
        valor: 200,
        tipo_movimento: 'saida',
      }),
    ).toBe(1000);
  });

  it('soma movimentos líquidos do Nubank', () => {
    const total = sumNetMovimentos([
      { valor: 100, tipo_movimento: 'entrada' },
      { valor: 30, tipo_movimento: 'saida' },
    ]);
    expect(total).toBe(70);
    expect(netMovimento({ valor: 50, tipo_movimento: 'saida' })).toBe(-50);
  });

  it('usa a data do primeiro lançamento exportado como referência', () => {
    const ref = resolveSaldoReferenceDate(
      { mes_competencia: '2026-07' },
      [{ data: new Date('2026-06-28T12:00:00Z') }],
    );
    expect(ref?.toISOString()).toBe('2026-06-28T00:00:00.000Z');
  });
});
