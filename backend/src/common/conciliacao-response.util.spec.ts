import { describe, expect, it } from 'vitest';
import { mapScoredCandidata } from './conciliacao-response.util';

describe('mapScoredCandidata', () => {
  it('achata nota e scores para o formato da API de conciliação', () => {
    const mapped = mapScoredCandidata({
      nota: {
        _id: '507f1f77bcf86cd799439011',
        numero: '123',
        tomador: 'Tulani Nascimento',
        valor: 459.4,
      },
      nameScore: 0.92,
      valueMatch: true,
      partialMatch: false,
      saldoAberto: 459.4,
      daysDiff: 2,
      dateClose: true,
      mesCompetencia: '2026-06',
      competenciaOffset: 0,
      competenciaMatch: true,
      totalScore: 0.95,
    });

    expect(mapped._id).toBe('507f1f77bcf86cd799439011');
    expect(mapped.numero).toBe('123');
    expect(mapped.tomador).toBe('Tulani Nascimento');
    expect(mapped.valor).toBe(459.4);
    expect(mapped.match?.totalScore).toBe(0.95);
    expect(mapped.match?.valueMatch).toBe(true);
    expect((mapped as { nota?: unknown }).nota).toBeUndefined();
  });
});
