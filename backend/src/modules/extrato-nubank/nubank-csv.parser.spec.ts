import { describe, expect, it } from 'vitest';
import { isIncomingCredit, parseNubankCsv } from './nubank-csv.parser';
import { tipoMovimentoFromNubank } from '../../common/movimento-bancario.util';

const CARTAO_CSV = `date,title,amount
2026-05-06,HONEST CONTABILIDADE EPP,319.2
2026-04-27,Pagamento recebido,-163.6
2026-04-20,Estorno de compra,-25.5`;

describe('parseNubankCsv — cartão de crédito', () => {
  it('detecta formato cartão e preserva títulos originais', () => {
    const { meta, rows } = parseNubankCsv(CARTAO_CSV);
    expect(meta.formato).toBe('cartao');
    expect(rows).toHaveLength(3);
    expect(rows[0].origem).toBe('cartao');
    expect(rows[0].descricao).toBe('HONEST CONTABILIDADE EPP');
    expect(rows[1].descricao).toBe('Pagamento recebido');
  });

  it('classifica amount > 0 como compra (débito / saída)', () => {
    const { rows } = parseNubankCsv(CARTAO_CSV);
    expect(rows[0].valor).toBe(319.2);
    expect(rows[0].tipo).toBe('debito');
    expect(tipoMovimentoFromNubank(rows[0].tipo)).toBe('saida');
  });

  it('classifica amount < 0 como pagamento/crédito (entrada)', () => {
    const { rows } = parseNubankCsv(CARTAO_CSV);
    expect(rows[1].valor).toBe(163.6);
    expect(rows[1].tipo).toBe('credito');
    expect(tipoMovimentoFromNubank(rows[1].tipo)).toBe('entrada');
  });

  it('não altera datas do CSV', () => {
    const { rows } = parseNubankCsv(CARTAO_CSV);
    expect(rows[0].data).toEqual(new Date(2026, 4, 6));
    expect(rows[1].data).toEqual(new Date(2026, 3, 27));
  });
});

describe('parseNubankCsv — conta corrente', () => {
  it('mantém regra da conta: positivo = crédito, negativo = débito', () => {
    const csv = `Data,Valor,Identificador,Descrição
06/05/2026,100.00,abc,Pix recebido de Cliente
06/05/2026,-50.00,def,Compra no débito`;
    const { meta, rows } = parseNubankCsv(csv);
    expect(meta.formato).toBe('conta');
    expect(rows[0].tipo).toBe('credito');
    expect(rows[1].tipo).toBe('debito');
  });
});

describe('isIncomingCredit', () => {
  it('identifica pix e transferências recebidas na conta', () => {
    expect(isIncomingCredit('Pix recebido de Cliente A', 100, 'conta')).toBe(true);
    expect(isIncomingCredit('Transferência recebida de Fulano', 50, 'conta')).toBe(true);
    expect(isIncomingCredit('Estorno de compra', 20, 'conta')).toBe(true);
  });

  it('rejeita compras, tarifas e movimentos de cartão', () => {
    expect(isIncomingCredit('Compra no débito - Mercado', 35, 'conta')).toBe(false);
    expect(isIncomingCredit('Pagamento de boleto', 120, 'conta')).toBe(false);
    expect(isIncomingCredit('Tarifa de manutenção', 5, 'conta')).toBe(false);
    expect(isIncomingCredit('Google Workspace', 163.6, 'cartao')).toBe(false);
    expect(isIncomingCredit('Pagamento recebido', 163.6, 'cartao')).toBe(false);
  });

  it('ignora valores não positivos', () => {
    expect(isIncomingCredit('Pix recebido de Cliente A', 0, 'conta')).toBe(false);
    expect(isIncomingCredit('Pix recebido de Cliente A', -10, 'conta')).toBe(false);
  });
});
