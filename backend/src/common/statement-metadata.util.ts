import type { ImportProfileMapping, StatementFileMetadata } from '../modules/import-intelligence/types/import-profile.types';
import { buildRawRow } from './csv-row.util';
import { extractStatementBalances } from './statement-balance.util';
import { parseDelimitedLine } from '../modules/import-intelligence/utils/csv-parse.util';

const CNPJ_PATTERN = /\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}/;
const CONTA_PATTERN = /conta\s*(?:corrente|cc)?\s*:?\s*([\d.x-]+)/i;
const PERIODO_PATTERN =
  /per[ií]odo\s+(?:a partir de|de|entre)\s*:?\s*(\d{2}\/\d{2}\/\d{4})(?:\s*(?:a|até)\s*(\d{2}\/\d{2}\/\d{4}))?/i;

function firstMatch(line: string, pattern: RegExp): string | undefined {
  const match = line.match(pattern);
  return match?.[1]?.trim() || undefined;
}

function scanPreambleLines(lines: string[], headerRow: number, delimiter: ',' | ';' | '\t') {
  const meta: StatementFileMetadata = {};

  for (let i = 0; i < Math.min(headerRow - 1, lines.length); i += 1) {
    const line = lines[i].trim();
    if (!line) continue;
    const lower = line.toLowerCase();

    const cnpj = line.match(CNPJ_PATTERN)?.[0];
    if (cnpj && !meta.empresa_cnpj) meta.empresa_cnpj = cnpj;

    const conta = firstMatch(line, CONTA_PATTERN);
    if (conta && !meta.conta_corrente) meta.conta_corrente = conta;

    const periodo = line.match(PERIODO_PATTERN);
    if (periodo) {
      meta.periodo = periodo[2] ? `${periodo[1]} a ${periodo[2]}` : periodo[1];
    }

    if (lower.includes('saldo inicial') && meta.saldo_inicial == null) {
      const cells = parseDelimitedLine(line, delimiter);
      for (const cell of cells) {
        if (/saldo/i.test(cell)) continue;
        const parsed = Number.parseFloat(cell.replace(/\./g, '').replace(',', '.'));
        if (Number.isFinite(parsed)) {
          meta.saldo_inicial = Math.abs(parsed);
          break;
        }
      }
    }

    if (!meta.empresa_nome && !lower.includes('saldo') && !CNPJ_PATTERN.test(line)) {
      const cells = parseDelimitedLine(line, delimiter);
      const candidate = cells.find((cell) => cell.trim().length >= 3 && !/^\d+$/.test(cell.trim()));
      if (candidate && candidate.length < 80) {
        meta.empresa_nome = candidate.trim();
      } else if (line.length < 80 && !line.includes(delimiter)) {
        meta.empresa_nome = line;
      }
    }
  }

  return meta;
}

function listUnmappedColumns(
  headers: string[],
  columns: ImportProfileMapping['columns'],
): string[] {
  const mapped = new Set(
    Object.values(columns)
      .filter((value): value is string => Boolean(value?.trim()))
      .map((value) => value.trim()),
  );
  return headers.filter((header) => header.trim() && !mapped.has(header.trim()));
}

/** Extrai metadados do extrato: saldos, empresa, conta, período e colunas extras. */
export function extractStatementFileMetadata(
  content: string,
  mapping: ImportProfileMapping,
): StatementFileMetadata {
  const lines = content.split(/\r?\n/).filter((line) => line.trim().length > 0);
  const delimiter = mapping.delimiter ?? ';';
  const headers = parseDelimitedLine(lines[mapping.header_row - 1] || '', delimiter).filter(Boolean);
  const balances = extractStatementBalances(content, mapping);
  const preamble = scanPreambleLines(lines, mapping.header_row, delimiter);

  return {
    ...preamble,
    saldo_inicial: balances.saldoInicial ?? preamble.saldo_inicial,
    saldo_final: balances.saldoFinal ?? undefined,
    extra_columns: listUnmappedColumns(headers, mapping.columns),
  };
}

export function mergeJsonOriginalExtras(
  raw: Record<string, string>,
  extraColumns: string[] | undefined,
): Record<string, unknown> {
  if (!extraColumns?.length) return raw;
  const extras: Record<string, string> = {};
  for (const column of extraColumns) {
    const value = raw[column]?.trim();
    if (value) extras[column] = value;
  }
  if (Object.keys(extras).length === 0) return raw;
  return { ...raw, _extras: extras };
}
