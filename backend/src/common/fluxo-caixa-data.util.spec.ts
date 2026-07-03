import { describe, expect, it } from 'vitest';
import {
  annotateLancamentosOrigem,
  buildDateFilter,
  detectNubankOrigemFromMapping,
  extractFaturaIdFromDescricao,
  filterLancamentosForFluxoCaixaExport,
  mapLancamentosToFluxoCaixaRows,
  resolveStatementMonthFromFileName,
  splitNubankLancamentosFluxoCaixa,
} from './fluxo-caixa-data.util';
import { resolveFluxoCaixaCategoriaCartao } from './fluxo-caixa-lista';

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

describe('mapLancamentosToFluxoCaixaRows — cartão', () => {
  it('exporta compras como saída e pagamentos como entrada', () => {
    const lancamentos = [
      {
        origem: 'cartao',
        data: '2026-05-06',
        descricao: 'HONEST CONTABILIDADE EPP',
        valor: 319.2,
        tipo_movimento: 'saida' as const,
      },
      {
        origem: 'cartao',
        data: '2026-04-27',
        descricao: 'Pagamento recebido',
        valor: 163.6,
        tipo_movimento: 'entrada' as const,
      },
    ];

    const { rows } = mapLancamentosToFluxoCaixaRows(
      lancamentos,
      new Map(),
      (item) => item.descricao || '',
      undefined,
      (item) => item.tipo_movimento || 'entrada',
      (tipo, historico) => resolveFluxoCaixaCategoriaCartao(tipo, historico),
    );

    expect(rows[0].tipo).toBe('Saída');
    expect(rows[0].categoria).toBe('Cartão de crédito');
    expect(rows[0].historico).toBe('HONEST CONTABILIDADE EPP');
    expect(rows[0].valor).toBe(319.2);

    expect(rows[1].tipo).toBe('Entrada');
    expect(rows[1].categoria).toBe('Pagamento de cartão');
    expect(rows[1].historico).toBe('Pagamento recebido');
    expect(rows[1].valor).toBe(163.6);
  });
});

describe('origem Nubank', () => {
  it('detecta cartão pelo mapeamento title/amount', () => {
    expect(
      detectNubankOrigemFromMapping({
        columns: { data: 'date', valor: 'amount', descricao: 'title', transacao_id: null },
      }),
    ).toBe('cartao');
    expect(
      detectNubankOrigemFromMapping({
        columns: { data: 'Data', valor: 'Valor', descricao: 'Descrição', transacao_id: 'Identificador' },
      }),
    ).toBe('conta');
  });

  it('infere origem pelo json_original de cada lançamento', () => {
    const annotated = annotateLancamentosOrigem({
      lancamentos: [
        { descricao: 'Compra', json_original: { title: 'Google', amount: '163,60' } },
        { descricao: 'Pix', json_original: { Identificador: 'abc', Descrição: 'Pix recebido' } },
      ],
      profileSystemKey: 'nubank',
      profileMapping: {
        columns: { data: 'Data', valor: 'Valor', descricao: 'Descrição', transacao_id: 'Identificador' },
      },
    });

    expect(annotated[0].origem).toBe('cartao');
    expect(annotated[1].origem).toBe('conta');
  });

  it('detecta cartão em perfil customizado sem system_key', () => {
    const annotated = annotateLancamentosOrigem({
      lancamentos: [{ descricao: 'Google Workspace', json_original: { date: '2026-06-02', title: 'Google', amount: '163.60' } }],
      profileMapping: {
        columns: { data: 'date', valor: 'amount', descricao: 'title', transacao_id: null },
      },
    });

    expect(annotated[0].origem).toBe('cartao');
  });

  it('extrai mês da fatura do nome do arquivo', () => {
    expect(resolveStatementMonthFromFileName('Nubank_2026-06-02.csv')).toBe('2026-06');
    expect(resolveStatementMonthFromFileName('extrato.csv')).toBeUndefined();
  });
});
