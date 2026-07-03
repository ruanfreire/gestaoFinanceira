import type { ImportProfileMapping } from '../modules/import-intelligence/types/import-profile.types';
import {
  parseDelimitedLine,
  parseMoneyValue,
} from '../modules/import-intelligence/utils/csv-parse.util';

export type StatementBalances = {
  saldoInicial: number | null;
  saldoFinal: number | null;
};

function rowFromCells(headers: string[], cells: string[]): Record<string, string> {
  const row: Record<string, string> = {};
  headers.forEach((header, index) => {
    row[header] = cells[index] ?? '';
  });
  return row;
}

function parseBalanceCell(value: string | undefined, decimalFormat: 'br' | 'us'): number | null {
  if (!value?.trim()) return null;
  const parsed = parseMoneyValue(value, decimalFormat);
  return parsed == null ? null : Math.abs(parsed);
}

/** Extrai saldo inicial/final de linhas meta do extrato (antes ou depois dos lançamentos). */
export function extractStatementBalances(
  content: string,
  mapping: ImportProfileMapping,
): StatementBalances {
  const lines = content.split(/\r?\n/).filter((line) => line.trim().length > 0);
  const delimiter = mapping.delimiter ?? ';';
  const headers = parseDelimitedLine(lines[mapping.header_row - 1] || '', delimiter).filter(Boolean);
  const col = mapping.columns;

  let saldoInicial: number | null = null;
  let saldoFinal: number | null = null;

  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i];
    const lower = line.toLowerCase();
    const isInicial = lower.includes('saldo inicial');
    const isFinal = lower.includes('saldo final');
    if (!isInicial && !isFinal) continue;

    const cells = parseDelimitedLine(line, delimiter);
    let value: number | null = null;

    if (i >= mapping.header_row - 1 && col.valor) {
      const raw = rowFromCells(headers, cells);
      value = parseBalanceCell(raw[col.valor], mapping.decimal_format);
    }

    if (value == null && col.descricao && i >= mapping.header_row - 1) {
      const raw = rowFromCells(headers, cells);
      for (const cell of Object.values(raw)) {
        if (/saldo/i.test(cell)) continue;
        value = parseBalanceCell(cell, mapping.decimal_format);
        if (value != null) break;
      }
    }

    if (value == null) {
      for (const cell of cells) {
        if (/saldo/i.test(cell)) continue;
        value = parseBalanceCell(cell, mapping.decimal_format);
        if (value != null) break;
      }
    }

    if (value == null) continue;
    if (isInicial) saldoInicial = value;
    if (isFinal) saldoFinal = value;
  }

  return { saldoInicial, saldoFinal };
}
