import { describe, expect, it } from 'vitest';
import {
  amountsEqual,
  datesAreClose,
  DATE_AUTO_MATCH_WINDOW_DAYS,
  nameSimilarity,
  normalizeName,
  pickDominantAutoMatch,
  scoreMatchCandidate,
  type ScoredNotaMatch,
} from './name-match.util';

describe('normalizeName', () => {
  it('remove acentos e pontuação', () => {
    expect(normalizeName('C.I.P. Consultoria')).toBe('c i p consultoria');
    expect(normalizeName('João Silva')).toBe('joao silva');
  });
});

describe('nameSimilarity', () => {
  it('nome idêntico após normalização', () => {
    expect(nameSimilarity('João Silva', 'Joao Silva')).toBe(1);
  });

  it('tomador abreviado ⊂ nome completo (Marta)', () => {
    const score = nameSimilarity(
      'Marta Jeruza Leal',
      'Marta Jeruza Vasconcelos Leal',
    );
    expect(score).toBeGreaterThanOrEqual(0.92);
  });

  it('ignora hífen e pontuação no nome (CIP)', () => {
    const score = nameSimilarity(
      'CAMARA INTERBANCARIA DE PAGAMENTOS - CIP',
      'Camara Interbancaria de Pagamentos CIP',
    );
    expect(score).toBeGreaterThanOrEqual(0.92);
  });
});

describe('amountsEqual', () => {
  it('tolera diferença de centavos', () => {
    expect(amountsEqual(2027.68, 2027.679)).toBe(true);
  });
});

describe('datesAreClose', () => {
  it('aceita repasse ~33 dias na janela automática', () => {
    const emission = new Date(2026, 4, 13);
    const payment = new Date(2026, 5, 15);
    expect(datesAreClose(payment, emission, DATE_AUTO_MATCH_WINDOW_DAYS)).toBe(true);
  });
});

describe('scoreMatchCandidate', () => {
  const paymentDate = new Date(2026, 5, 2);
  const payer = 'Marta Jeruza Vasconcelos Leal';
  const valor = 689.1;

  const nfMaio = {
    tomador: 'Marta Jeruza Leal',
    valor,
    data_emissao: new Date(2026, 4, 8),
    mes_competencia: '2026-05',
    status_pagamento: 'em_aberto',
  };

  const nfJunho = {
    tomador: 'Marta Jeruza Leal',
    valor,
    data_emissao: new Date(2026, 5, 14),
    mes_competencia: '2026-06',
    status_pagamento: 'em_aberto',
  };

  const nfAbril = {
    tomador: 'Marta Jeruza Leal',
    valor,
    data_emissao: new Date(2026, 3, 10),
    mes_competencia: '2026-04',
    status_pagamento: 'em_aberto',
  };

  it('preferência junho vs maio vs abril no pagamento de junho', () => {
    const scoreJunho = scoreMatchCandidate(nfJunho, payer, valor, paymentDate);
    const scoreMaio = scoreMatchCandidate(nfMaio, payer, valor, paymentDate);
    const scoreAbril = scoreMatchCandidate(nfAbril, payer, valor, paymentDate);

    expect(scoreJunho.competenciaMatch).toBe(true);
    expect(scoreJunho.competenciaOffset).toBe(0);
    expect(scoreMaio.competenciaMatch).toBe(true);
    expect(scoreMaio.competenciaOffset).toBe(1);
    expect(scoreAbril.competenciaMatch).toBe(false);

    expect(scoreJunho.totalScore).toBeGreaterThan(scoreMaio.totalScore);
    expect(scoreMaio.totalScore).toBeGreaterThan(scoreAbril.totalScore);
  });

  it('match por valor e data sem nome do pagador', () => {
    const score = scoreMatchCandidate(nfJunho, '', valor, paymentDate);
    expect(score.nameScore).toBe(0);
    expect(score.valueMatch).toBe(true);
    expect(score.competenciaMatch).toBe(true);
    expect(score.totalScore).toBeGreaterThan(0.4);
  });
});

describe('pickDominantAutoMatch', () => {
  const paymentDate = new Date(2026, 5, 10);

  function scored(
    id: string,
    emission: Date,
    mes_competencia: string,
    daysDiff: number,
    extra: Partial<ScoredNotaMatch> = {},
  ): ScoredNotaMatch {
    const base = scoreMatchCandidate(
      {
        tomador: 'Cliente Teste',
        valor: 758,
        data_emissao: emission,
        mes_competencia,
        status_pagamento: 'em_aberto',
      },
      'Cliente Teste',
      758,
      paymentDate,
    );
    return {
      ...base,
      daysDiff,
      dateClose: Math.abs(daysDiff) <= 30,
      nota: { _id: id, data_emissao: emission },
      ...extra,
    };
  }

  it('escolhe NF de junho quando maio e junho têm mesmo valor (Marta)', () => {
    const junho = scored('399', new Date(2026, 5, 14), '2026-06', -4);
    const maio = scored('366', new Date(2026, 4, 8), '2026-05', 33);

    const picked = pickDominantAutoMatch([maio, junho]);
    expect(String(picked?._id)).toBe('399');
  });

  it('escolhe candidato com data claramente mais próxima (Lana 9 vs 22 dias)', () => {
    const closer = scored('a', new Date(2026, 5, 1), '2026-06', 9);
    const farther = scored('b', new Date(2026, 4, 18), '2026-05', 22);

    const picked = pickDominantAutoMatch([farther, closer]);
    expect(String(picked?._id)).toBe('a');
  });

  it('retorna null quando empate ambíguo', () => {
    const a = scored('a', new Date(2026, 5, 1), '2026-06', 15);
    const b = scored('b', new Date(2026, 5, 3), '2026-06', 17);

    expect(pickDominantAutoMatch([a, b])).toBeNull();
  });
});
