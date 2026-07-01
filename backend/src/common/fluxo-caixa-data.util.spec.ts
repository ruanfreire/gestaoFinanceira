import { describe, expect, it } from 'vitest';
import {
  buildDateFilter,
  extractFaturaIdFromDescricao,
  filterLancamentosForFluxoCaixaExport,
  splitNubankLancamentosFluxoCaixa,
} from './fluxo-caixa-data.util';

describe('filterLancamentosForFluxoCaixaExport', () => {
  const notaById = new Map([
    ['n1', { _id: 'n1', mes_competencia: '2026-06', numero: '100' }],
    ['n2', { _id: 'n2', mes_competencia: '2026-07', numero: '200' }],
  ]);

  const lancamentos = [
    {
      nota_id: 'n1',
      data: '2026-06-05',
      descricao: 'Cobrança recebida - fatura nr. 12345 Cliente A',
    },
    {
      nota_id: undefined,
      data: '2026-06-05',
      descricao: 'Taxa de cartão - fatura nr. 12345 Cliente A',
    },
    {
      nota_id: undefined,
      data: '2026-06-05',
      descricao: 'Transação via Pix com dados manuais',
    },
    {
      nota_id: undefined,
      data: '2026-06-10',
      descricao: 'Pagamento de conta - 06/2026',
    },
    {
      nota_id: 'n2',
      data: '2026-06-15',
      descricao: 'Cobrança recebida - fatura nr. 99999 Cliente B',
    },
  ];

  it('inclui cobrança da competência e taxas da mesma fatura', () => {
    const result = filterLancamentosForFluxoCaixaExport(lancamentos, '2026-06', notaById);
    expect(result).toHaveLength(2);
    expect(result[0].descricao).toContain('Cobrança recebida');
    expect(result[1].descricao).toContain('Taxa de cartão');
  });

  it('exclui Pix e pagamentos sem vínculo com NF da competência', () => {
    const result = filterLancamentosForFluxoCaixaExport(lancamentos, '2026-06', notaById);
    expect(result.some((item) => String(item.descricao).includes('Pix'))).toBe(false);
    expect(result.some((item) => String(item.descricao).includes('Pagamento de conta'))).toBe(false);
  });

  it('extrai id da fatura na descrição', () => {
    expect(extractFaturaIdFromDescricao('Taxa do Pix - fatura nr. 834825982')).toBe('834825982');
  });

  it('retorna todos os lançamentos no modo período (sem competência)', () => {
    const result = filterLancamentosForFluxoCaixaExport(lancamentos, undefined, notaById);
    expect(result).toHaveLength(lancamentos.length);
  });

  it('separa cartão Nubank por mês da compra', () => {
    const notaById = new Map([
      ['n1', { _id: 'n1', mes_competencia: '2026-06', numero: '1' }],
    ]);
    const lancamentos = [
      { nota_id: 'n1', origem: 'conta', data: '2026-06-05', descricao: 'Cobrança' },
      { origem: 'cartao', data: '2026-06-10', descricao: 'Compra cartão' },
      { origem: 'cartao', data: '2026-05-02', descricao: 'Compra maio' },
    ];
    const { conta, cartao } = splitNubankLancamentosFluxoCaixa(
      lancamentos,
      '2026-06',
      notaById,
    );
    expect(conta).toHaveLength(1);
    expect(cartao).toHaveLength(1);
    expect(cartao[0].descricao).toContain('Compra cartão');
  });

  it('inclui todo cartão no período quando não há competência', () => {
    const lancamentos = [
      { origem: 'cartao', data: '2026-06-10', descricao: 'Compra 1' },
      { origem: 'cartao', data: '2026-06-15', descricao: 'Compra 2' },
    ];
    const { cartao } = splitNubankLancamentosFluxoCaixa(lancamentos, undefined, new Map());
    expect(cartao).toHaveLength(2);
  });
});

describe('buildDateFilter', () => {
  it('monta intervalo inclusivo em UTC', () => {
    const filter = buildDateFilter('2026-06-01', '2026-06-30');
    expect(filter?.$gte?.toISOString()).toBe('2026-06-01T00:00:00.000Z');
    expect(filter?.$lte?.toISOString()).toBe('2026-06-30T23:59:59.999Z');
  });

  it('retorna undefined sem datas', () => {
    expect(buildDateFilter()).toBeUndefined();
  });
});
