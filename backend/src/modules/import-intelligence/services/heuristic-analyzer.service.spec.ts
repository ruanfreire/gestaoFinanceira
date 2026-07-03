import { describe, expect, it } from 'vitest';
import { analyzeCsvHeuristic, parseWithMapping } from '../services/heuristic-analyzer.service';
import type { ImportProfileMapping } from '../types/import-profile.types';

const SAMPLE_CSV = `Conta Corrente
Saldo inicial;1000,00
Data;Histórico;Valor
10/05/2026;Pix recebido Cliente A;2500,00
11/05/2026;Taxa bancária;-12,50
12/05/2026;Pix Cliente B;1800,00
`;

describe('heuristic-analyzer', () => {
  it('detecta colunas data, valor e descrição', () => {
    const result = analyzeCsvHeuristic(SAMPLE_CSV, 'extrato-inter.csv');
    expect(result.mapping.columns.data).toBeTruthy();
    expect(result.mapping.columns.valor).toBeTruthy();
    expect(result.overall_confidence).toBeGreaterThan(0.5);
  });

  it('normaliza linhas com mapping', () => {
    const analysis = analyzeCsvHeuristic(SAMPLE_CSV, 'extrato-inter.csv');
    const { rows, errors } = parseWithMapping(SAMPLE_CSV, analysis.mapping);
    expect(errors.length).toBe(0);
    expect(rows.length).toBeGreaterThanOrEqual(2);
    expect(rows[0].tipo_movimento).toBe('entrada');
    expect(rows[0].pagador_nome).toBe('Cliente A');
    expect(rows[2].pagador_nome).toBe('Cliente B');
  });

  it('extrai pagador e tipo em extrato Asaas', async () => {
    const { readFileSync } = await import('node:fs');
    const { fileURLToPath } = await import('node:url');
    const { dirname, join } = await import('node:path');
    const dir = dirname(fileURLToPath(import.meta.url));
    const csv = readFileSync(join(dir, '../fixtures/asaas-extrato.csv'), 'utf-8');
    const mapping: ImportProfileMapping = {
      header_row: 1,
      delimiter: ',',
      columns: {
        data: 'Data',
        valor: 'Valor',
        descricao: 'Descrição',
        tipo_transacao: 'Transação',
        saldo: 'Saldo',
        transacao_id: null,
        pagador_nome: null,
        documento: null,
      },
      date_format: 'DD/MM/YYYY',
      decimal_format: 'us',
      tipo_movimento_rule: { type: 'sign' },
      skip_row_patterns: ['saldo inicial'],
    };
    const { rows } = parseWithMapping(csv, mapping);
    expect(rows).toHaveLength(2);
    expect(rows[0].pagador_nome).toBe('Luana Barreto Kaderabek');
    expect(rows[0].tipo_transacao).toBe('Cobrança recebida');
    expect(rows[0].saldo_pos).toBe(1500);
    expect(rows[0].fatura_numero).toBe('682228893');
    expect(rows[0].tipo_movimento).toBe('entrada');
    expect(rows[1].tipo_movimento).toBe('saida');
  });
});
