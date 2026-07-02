import { describe, expect, it } from 'vitest';
import { sumConciliacaoCounts } from './conciliacao-counts.util';

describe('sumConciliacaoCounts', () => {
  it('soma pendentes e sem_match de Asaas e Nubank', () => {
    expect(
      sumConciliacaoCounts(
        { pendentes: 3, sem_match: 1 },
        { pendentes: 2, sem_match: 4 },
      ),
    ).toEqual({ pendentes: 5, sem_match: 5 });
  });
});
