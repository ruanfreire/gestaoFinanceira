import { describe, expect, it } from 'vitest';
import {
  normalizeDocumento,
  rankTomadorMatches,
  scoreTomadorMatch,
  tomadorGroupKey,
  uniqueAliases,
} from './tomador-match.util';

describe('tomador-match.util', () => {
  it('prioriza match exato no nome', () => {
    expect(scoreTomadorMatch({ nome: 'Luana Barreto Kaderabek' }, 'Luana Barreto Kaderabek')).toBe(1);
  });

  it('usa aliases de pagamento no extrato', () => {
    const score = scoreTomadorMatch(
      {
        nome: 'Luana Barreto Kaderabek',
        aliases_pagamento: ['Luana B Kaderabek'],
      },
      'Luana B Kaderabek',
    );
    expect(score).toBeGreaterThanOrEqual(0.9);
  });

  it('ranqueia candidatos acima do limiar', () => {
    const ranked = rankTomadorMatches(
      [
        { _id: '1', nome: 'Cliente Alpha' },
        { _id: '2', nome: 'Cliente Beta' },
        { _id: '3', nome: 'Fornecedor XYZ' },
      ],
      'Cliente Alpha',
    );
    expect(ranked.length).toBeGreaterThanOrEqual(1);
    expect(String(ranked[0].tomador._id)).toBe('1');
    expect(ranked[0].score).toBe(1);
  });

  it('normaliza documento fiscal', () => {
    expect(normalizeDocumento('39.803.761/0001-17')).toBe('39803761000117');
  });

  it('agrupa por documento quando disponível', () => {
    expect(tomadorGroupKey('Nome A', '39.803.761/0001-17')).toBe('doc:39803761000117');
    expect(tomadorGroupKey('Nome A', '')).toBe('nome:nome a');
  });

  it('deduplica aliases normalizados', () => {
    expect(uniqueAliases(['Luana B', 'luana b', '  '])).toEqual(['Luana B']);
  });
});
