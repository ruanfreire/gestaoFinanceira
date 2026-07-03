import { describe, expect, it } from 'vitest';
import { extractStatementBalances } from './statement-balance.util';
import type { ImportProfileMapping } from '../modules/import-intelligence/types/import-profile.types';

const INTER_MAPPING: ImportProfileMapping = {
  header_row: 1,
  delimiter: ';',
  columns: { data: 'Data', valor: 'Valor', descricao: 'Histórico', transacao_id: null },
  date_format: 'DD/MM/YYYY',
  decimal_format: 'br',
  tipo_movimento_rule: { type: 'sign' },
  skip_row_patterns: ['saldo inicial', 'saldo final'],
};

describe('extractStatementBalances', () => {
  it('lê saldo inicial de linha meta antes do cabeçalho (Inter)', () => {
    const csv = `Conta Corrente
Saldo inicial;15234,56
Data;Histórico;Valor
01/06/2026;Pix recebido;500,00
`;

    const mapping = { ...INTER_MAPPING, header_row: 3 };
    const balances = extractStatementBalances(csv, mapping);
    expect(balances.saldoInicial).toBe(15234.56);
  });

  it('lê saldo inicial em linha com colunas do extrato', () => {
    const csv = `Data;Histórico;Valor
Saldo inicial;Saldo inicial;9876,54
01/06/2026;Pix recebido;500,00
`;

    const balances = extractStatementBalances(csv, INTER_MAPPING);
    expect(balances.saldoInicial).toBe(9876.54);
  });

  it('lê saldo inicial em extrato Asaas (coluna Saldo)', () => {
    const csv = `Data,Transação,Descrição,Valor,Saldo
Saldo Inicial,,,1000.00,1000.00
01/06/2026,Cobrança recebida,Cobrança recebida - fatura nr. 1 Cliente,500.00,1500.00
`;

    const balances = extractStatementBalances(csv, {
      header_row: 1,
      delimiter: ',',
      columns: { data: 'Data', valor: 'Valor', descricao: 'Descrição', transacao_id: 'Transação' },
      date_format: 'DD/MM/YYYY',
      decimal_format: 'us',
      tipo_movimento_rule: { type: 'sign' },
      skip_row_patterns: ['saldo inicial'],
    });
    expect(balances.saldoInicial).toBe(1000);
  });
});
