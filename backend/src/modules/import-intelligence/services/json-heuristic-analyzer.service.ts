import { extractNotaItemsFromJson } from '../../importacoes/nf-json.mapper';
import type { ImportAnalysisResult, ImportProfileMapping, NormalizedLancamentoRow } from '../types/import-profile.types';
import { defaultMapping } from './heuristic-analyzer.service';
import { hashRow, parseDateValue, parseMoneyValue } from '../utils/csv-parse.util';
import { resolveTipoMovimento } from '../../../common/movimento-bancario.util';
import { resolvePagadorNome } from '../../../common/pagador-from-descricao.util';

const KEY_HINTS: Record<string, string[]> = {
  data: ['data', 'date', 'dt', 'datalancamento', 'posted_at'],
  valor: ['valor', 'amount', 'value', 'quantia', 'vlr'],
  descricao: ['descricao', 'description', 'historico', 'memo', 'title', 'detalhe', 'oquefoi'],
  pagador_nome: ['quempagou', 'pagador', 'payer', 'cliente', 'payee', 'tomador'],
  transacao_id: ['id', 'transacao', 'transaction', 'referencia', 'identifier'],
};

function normalizeKey(key: string): string {
  return key
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, '');
}

function scoreKey(key: string, hints: string[]): number {
  const norm = normalizeKey(key);
  for (const hint of hints) {
    if (norm === hint) return 1;
    if (norm.includes(hint)) return 0.85;
  }
  return 0;
}

function inferJsonField(keys: string[], field: keyof typeof KEY_HINTS): string | null {
  let best: string | null = null;
  let bestScore = 0;
  for (const key of keys) {
    const score = scoreKey(key, KEY_HINTS[field]);
    if (score > bestScore) {
      bestScore = score;
      best = key;
    }
  }
  return bestScore >= 0.85 ? best : null;
}

function extractTransactionArray(parsed: unknown): Record<string, unknown>[] | null {
  if (Array.isArray(parsed)) {
    return parsed.filter((item) => item && typeof item === 'object') as Record<string, unknown>[];
  }
  if (!parsed || typeof parsed !== 'object') return null;
  const root = parsed as Record<string, unknown>;
  for (const key of ['transactions', 'lancamentos', 'data', 'items', 'movimentos']) {
    const candidate = root[key];
    if (Array.isArray(candidate) && candidate.length > 0 && typeof candidate[0] === 'object') {
      return candidate as Record<string, unknown>[];
    }
  }
  return null;
}

export type JsonAnalysisKind = 'nota_fiscal' | 'bank_transactions' | 'unknown';

export function analyzeJsonHeuristic(content: string, fileName: string): ImportAnalysisResult {
  let parsed: unknown;
  try {
    parsed = JSON.parse(content);
  } catch {
    return {
      file_kind: 'json',
      banco_label_suggested: 'JSON inválido',
      mapping: defaultMapping(),
      field_confidence: {},
      overall_confidence: 0,
      gaps: [{ field: 'json', severity: 'error', message: 'Arquivo JSON inválido ou corrompido.' }],
      source: 'heuristic',
      sample_normalized: [],
      total_rows_parsed: 0,
      parse_errors: ['JSON inválido'],
      detected_json_kind: 'unknown',
    };
  }

  const nfItems = extractNotaItemsFromJson(parsed);
  if (nfItems.length > 0) {
    return {
      file_kind: 'json',
      banco_label_suggested: 'Notas fiscais',
      mapping: defaultMapping(),
      field_confidence: {},
      overall_confidence: 1,
      gaps: [
        {
          field: 'json_type',
          severity: 'info',
          message: `Arquivo de notas fiscais detectado (${nfItems.length} nota(s)). Use Arquivos → Enviar notas.`,
        },
      ],
      source: 'heuristic',
      sample_normalized: [],
      total_rows_parsed: nfItems.length,
      parse_errors: [],
      detected_json_kind: 'nota_fiscal',
    };
  }

  const rows = extractTransactionArray(parsed);
  if (!rows?.length) {
    return {
      file_kind: 'json',
      banco_label_suggested: fileName.replace(/\.json$/i, ''),
      mapping: defaultMapping(),
      field_confidence: {},
      overall_confidence: 0,
      gaps: [{ field: 'structure', severity: 'error', message: 'Estrutura JSON não reconhecida como extrato bancário.' }],
      source: 'heuristic',
      sample_normalized: [],
      total_rows_parsed: 0,
      parse_errors: ['Estrutura não suportada'],
      detected_json_kind: 'unknown',
    };
  }

  const keys = Object.keys(rows[0]);
  const dataCol = inferJsonField(keys, 'data');
  const valorCol = inferJsonField(keys, 'valor');
  const descCol = inferJsonField(keys, 'descricao');
  const pagadorCol = inferJsonField(keys, 'pagador_nome');
  const idCol = inferJsonField(keys, 'transacao_id');

  const mapping: ImportProfileMapping = {
    header_row: 1,
    delimiter: ',',
    columns: {
      data: dataCol,
      valor: valorCol,
      descricao: descCol,
      pagador_nome: pagadorCol,
      transacao_id: idCol,
    },
    date_format: 'auto',
    decimal_format: 'us',
    tipo_movimento_rule: { type: 'sign' },
    skip_row_patterns: [],
  };

  const field_confidence: ImportAnalysisResult['field_confidence'] = {
    data: dataCol ? 0.9 : 0,
    valor: valorCol ? 0.9 : 0,
    descricao: descCol ? 0.85 : 0,
    pagador_nome: pagadorCol ? 0.8 : 0,
    transacao_id: idCol ? 0.75 : 0,
  };

  const confidences = Object.values(field_confidence).filter((v) => typeof v === 'number') as number[];
  const overall_confidence = confidences.length ? confidences.reduce((a, b) => a + b, 0) / confidences.length : 0;

  const gaps: ImportAnalysisResult['gaps'] = [];
  if (!dataCol || !valorCol) {
    gaps.push({ field: 'mapping', severity: 'error', message: 'Campos data e valor são obrigatórios no JSON.' });
  }

  return {
    file_kind: 'json',
    banco_label_suggested: fileName.replace(/\.json$/i, ''),
    mapping,
    field_confidence,
    overall_confidence,
    gaps,
    source: 'heuristic',
    sample_normalized: [],
    total_rows_parsed: rows.length,
    parse_errors: [],
    detected_headers: keys,
    detected_json_kind: 'bank_transactions',
  };
}

export function parseJsonWithMapping(
  content: string,
  mapping: ImportProfileMapping,
): { rows: NormalizedLancamentoRow[]; errors: string[] } {
  let parsed: unknown;
  try {
    parsed = JSON.parse(content);
  } catch {
    return { rows: [], errors: ['JSON inválido'] };
  }

  const items = extractTransactionArray(parsed);
  if (!items?.length) return { rows: [], errors: ['Nenhuma transação encontrada no JSON'] };

  const col = mapping.columns;
  if (!col.data || !col.valor) {
    return { rows: [], errors: ['Mapeamento incompleto: data e valor são obrigatórios.'] };
  }

  const errors: string[] = [];
  const rows: NormalizedLancamentoRow[] = [];

  for (let i = 0; i < items.length; i += 1) {
    const raw = items[i];
    const dataRaw = String(raw[col.data] ?? '');
    const valorRaw = String(raw[col.valor] ?? '');
    const data = parseDateValue(dataRaw, mapping.date_format === 'auto' ? 'DD/MM/YYYY' : mapping.date_format);
    const valor = parseMoneyValue(valorRaw, mapping.decimal_format);

    if (!data || valor == null) {
      errors.push(`Item ${i + 1}: data ou valor inválidos.`);
      continue;
    }

    const descricao = col.descricao ? String(raw[col.descricao] ?? '').trim() : '';
    const pagadorCol =
      col.pagador_nome && col.pagador_nome !== col.descricao
        ? String(raw[col.pagador_nome] ?? '').trim()
        : '';
    const tipo_movimento = resolveTipoMovimento(valor, descricao);
    const pagador = resolvePagadorNome(pagadorCol || undefined, descricao, tipo_movimento);
    const transacao_id = col.transacao_id
      ? String(raw[col.transacao_id] ?? '').trim()
      : hashRow([data.toISOString(), String(valor), descricao, pagador || '']);

    rows.push({
      transacao_id,
      data,
      valor: Math.abs(valor),
      descricao: descricao || pagador || 'Lançamento',
      pagador_nome: pagador,
      tipo_movimento,
      json_original: raw,
    });
  }

  return { rows, errors };
}
