import type {
  AnalysisGap,
  FieldConfidence,
  FileKind,
  ImportAnalysisResult,
  ImportProfileMapping,
  NormalizedLancamentoRow,
  NormalizedLancamentoSample,
} from '../types/import-profile.types';
import {
  detectDelimiter,
  hashRow,
  normalizeHeader,
  parseCsvLine,
  parseDelimitedLine,
  parseDateValue,
  parseMoneyValue,
} from '../utils/csv-parse.util';
import { resolveTipoMovimento, tipoMovimentoFromAsaas, type TipoMovimento } from '../../../common/movimento-bancario.util';
import { resolvePagadorNome } from '../../../common/pagador-from-descricao.util';
import {
  buildRawRow,
  extractFaturaNumero,
  looksLikeTransactionId,
  looksLikeTransactionType,
} from '../../../common/csv-row.util';
import type { TipoMovimentoRule } from '../types/import-profile.types';

const COLUMN_HINTS: Record<string, string[]> = {
  data: ['data', 'date', 'dt', 'lancamento'],
  valor: ['valor', 'amount', 'value', 'quantia', 'vlr', 'credito', 'debito'],
  descricao: ['descricao', 'desc', 'historico', 'history', 'memo', 'detalhe', 'o que foi', 'oque foi'],
  pagador_nome: ['quem pagou', 'pagador', 'nome pagador', 'cliente', 'tomador', 'beneficiario', 'payee', 'payer'],
  transacao_id: ['identificador', 'uuid', 'id transacao', 'id da transacao', 'referencia', 'ref', 'end to end', 'e2e'],
  tipo_transacao: ['transacao', 'tipo', 'type', 'movimento', 'operacao', 'natureza'],
  saldo: ['saldo', 'balance'],
  documento: ['documento', 'doc', 'comprovante', 'numero documento', 'num doc', 'codigo', 'código'],
};

function scoreHeader(header: string, hints: string[]): number {
  const norm = normalizeHeader(header);
  if (!norm) return 0;
  for (const hint of hints) {
    if (norm === hint) return 1;
    if (norm.includes(hint)) return 0.85;
  }
  return 0;
}

function inferColumn(
  headers: string[],
  field: keyof typeof COLUMN_HINTS,
  sampleRows: Record<string, string>[] = [],
): { column: string | null; confidence: number } {
  let best: string | null = null;
  let bestScore = 0;
  for (const header of headers) {
    let score = scoreHeader(header, COLUMN_HINTS[field]);
    if (score === 0) continue;

    const samples = sampleRows
      .map((row) => row[header])
      .filter((value) => Boolean(value?.trim()))
      .slice(0, 5);

    if (field === 'transacao_id' && samples.some((value) => looksLikeTransactionType(value))) {
      score *= 0.35;
    }
    if (field === 'tipo_transacao' && samples.some((value) => looksLikeTransactionType(value))) {
      score = Math.min(1, score + 0.1);
    }
    if (field === 'tipo_transacao' && samples.some((value) => (value?.length ?? 0) > 24)) {
      score *= 0.45;
    }
    if (field === 'tipo_transacao' && samples.some((value) => looksLikeTransactionId(value))) {
      score *= 0.4;
    }
    if (field === 'descricao' && samples.some((value) => (value?.length ?? 0) > 24)) {
      score = Math.min(1, score + 0.05);
    }
    if (field === 'documento' && samples.some((value) => /^[A-Z0-9-]{4,}$/i.test(value || ''))) {
      score = Math.min(1, score + 0.1);
    }

    if (score > bestScore) {
      bestScore = score;
      best = header;
    }
  }
  return { column: bestScore >= 0.85 ? best : null, confidence: bestScore };
}

function inferHeaderRow(lines: string[], delimiter: ',' | ';' | '\t'): number {
  for (let i = 0; i < Math.min(lines.length, 15); i += 1) {
    const cells = parseDelimitedLine(lines[i], delimiter);
    const normalized = cells.map(normalizeHeader);
    const hits = ['data', 'valor', 'descricao', 'historico', 'date', 'amount'].filter((hint) =>
      normalized.some((cell) => cell.includes(hint)),
    );
    if (hits.length >= 2) return i + 1;
  }
  return 1;
}

function inferDateFormat(samples: string[]): 'DD/MM/YYYY' | 'YYYY-MM-DD' {
  const br = samples.filter((s) => /^\d{2}\/\d{2}\/\d{4}/.test(s.trim())).length;
  const iso = samples.filter((s) => /^\d{4}-\d{2}-\d{2}/.test(s.trim())).length;
  return br >= iso ? 'DD/MM/YYYY' : 'YYYY-MM-DD';
}

function inferDecimalFormat(samples: string[]): 'br' | 'us' {
  const br = samples.filter((s) => /\d+\.\d{3},\d{2}/.test(s.trim())).length;
  return br > 0 ? 'br' : 'us';
}

export function inspectFileContent(content: string, fileName: string): { file_kind: FileKind; lines: string[] } {
  const lower = fileName.toLowerCase();
  if (lower.endsWith('.json')) {
    return { file_kind: 'json', lines: [] };
  }
  const lines = content.split(/\r?\n/).filter((line) => line.trim().length > 0);
  return { file_kind: 'csv', lines };
}

export function buildFileSignature(headers: string[], delimiter: string): string {
  return `headers:${headers.map(normalizeHeader).join('|')};delimiter:${delimiter}`;
}

export function analyzeCsvHeuristic(content: string, fileName: string): ImportAnalysisResult {
  const { file_kind, lines } = inspectFileContent(content, fileName);
  const gaps: AnalysisGap[] = [];
  const parse_errors: string[] = [];

  if (file_kind !== 'csv' || lines.length === 0) {
    return {
      file_kind: file_kind === 'json' ? 'json' : 'unknown',
      banco_label_suggested: 'Banco personalizado',
      mapping: defaultMapping(),
      field_confidence: {},
      overall_confidence: 0,
      gaps: [{ field: 'file', severity: 'error', message: 'Formato não suportado nesta fase (use CSV).' }],
      source: 'heuristic',
      sample_normalized: [],
      total_rows_parsed: 0,
      parse_errors: ['Formato não suportado'],
      detected_headers: [],
    };
  }

  const delimiter = detectDelimiter(lines.slice(0, 15));
  const header_row = inferHeaderRow(lines, delimiter);
  const headerCells = parseDelimitedLine(lines[header_row - 1] || '', delimiter);
  const headers = headerCells.filter(Boolean);

  const dataCol = inferColumn(headers, 'data');
  const valorCol = inferColumn(headers, 'valor');
  const descCol = inferColumn(headers, 'descricao');
  const pagadorCol = inferColumn(headers, 'pagador_nome');

  const dataSamples: string[] = [];
  const valorSamples: string[] = [];
  const sampleRows: Record<string, string>[] = [];
  for (const line of lines.slice(header_row, header_row + 20)) {
    const cells = parseDelimitedLine(line, delimiter);
    const row = rowFromCells(headers, cells);
    sampleRows.push(row);
    if (dataCol.column && row[dataCol.column]) dataSamples.push(String(row[dataCol.column]));
    if (valorCol.column && row[valorCol.column]) valorSamples.push(String(row[valorCol.column]));
  }

  const tipoCol = inferColumn(headers, 'tipo_transacao', sampleRows);
  const saldoCol = inferColumn(headers, 'saldo', sampleRows);
  const documentoCol = inferColumn(headers, 'documento', sampleRows);
  const idCol = inferColumn(headers, 'transacao_id', sampleRows);

  if (
    tipoCol.column &&
    idCol.column === tipoCol.column &&
    sampleRows.some((row) => looksLikeTransactionType(row[tipoCol.column!]))
  ) {
    idCol.column = null;
    idCol.confidence = 0;
  }

  const mapping: ImportProfileMapping = {
    header_row,
    delimiter,
    columns: {
      data: dataCol.column,
      valor: valorCol.column,
      descricao: descCol.column,
      pagador_nome: pagadorCol.column,
      transacao_id: idCol.column,
      tipo_transacao: tipoCol.column,
      saldo: saldoCol.column,
      documento: documentoCol.column,
    },
    date_format: inferDateFormat(dataSamples),
    decimal_format: inferDecimalFormat(valorSamples),
    tipo_movimento_rule: { type: 'sign' },
    skip_row_patterns: ['saldo inicial', 'saldo final', 'saldo do dia'],
  };

  const field_confidence: FieldConfidence = {
    data: dataCol.confidence,
    valor: valorCol.confidence,
    descricao: descCol.confidence,
    pagador_nome: pagadorCol.confidence,
    transacao_id: idCol.confidence,
    tipo_transacao: tipoCol.confidence,
    saldo: saldoCol.confidence,
    documento: documentoCol.confidence,
    header_row: header_row > 0 ? 0.9 : 0.3,
  };

  if (!mapping.columns.data) {
    gaps.push({ field: 'data', severity: 'error', message: 'Coluna de data não detectada.' });
  }
  if (!mapping.columns.valor) {
    gaps.push({ field: 'valor', severity: 'error', message: 'Coluna de valor não detectada.' });
  }
  if (!mapping.columns.descricao) {
    gaps.push({ field: 'descricao', severity: 'warning', message: 'Coluna de descrição não detectada.' });
  }
  if (!mapping.columns.pagador_nome) {
    gaps.push({
      field: 'pagador_nome',
      severity: 'warning',
      message: 'Sem pagador — conciliação automática será limitada.',
    });
  }

  const { rows, errors } = parseWithMapping(content, mapping);
  parse_errors.push(...errors);

  const scores = [
    field_confidence.data,
    field_confidence.valor,
    field_confidence.descricao,
    field_confidence.header_row,
    field_confidence.pagador_nome,
  ].filter((v): v is number => typeof v === 'number');

  for (const key of ['transacao_id', 'tipo_transacao', 'saldo', 'documento'] as const) {
    if (mapping.columns[key] && typeof field_confidence[key] === 'number') {
      scores.push(field_confidence[key]!);
    }
  }

  const overall_confidence = scores.length ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;

  const baseName = fileName.replace(/\.[^.]+$/, '').split(/[\\/]/).pop() || 'Banco';

  return {
    file_kind: 'csv',
    banco_label_suggested: baseName,
    mapping,
    field_confidence,
    overall_confidence,
    gaps,
    source: 'heuristic',
    sample_normalized: toSampleRows(rows),
    total_rows_parsed: rows.length,
    parse_errors,
    detected_headers: headers,
  };
}

export function defaultMapping(): ImportProfileMapping {
  return {
    header_row: 1,
    delimiter: ';',
    columns: {},
    date_format: 'auto',
    decimal_format: 'br',
    tipo_movimento_rule: { type: 'sign' },
    skip_row_patterns: [],
  };
}

function rowFromCells(headers: string[], cells: string[]): Record<string, string> {
  return buildRawRow(headers, cells);
}

function resolveTransacaoId(
  raw: Record<string, string>,
  col: ImportProfileMapping['columns'],
  fallbackParts: string[],
): string {
  if (col.transacao_id) {
    const id = String(raw[col.transacao_id] || '').trim();
    if (id && looksLikeTransactionId(id)) return id;
    if (id && !col.tipo_transacao && !looksLikeTransactionType(id)) return id;
  }
  if (col.documento) {
    const doc = String(raw[col.documento] || '').trim();
    if (doc) return `doc:${doc}`;
  }
  return hashRow(fallbackParts);
}

function enrichRowFields(
  raw: Record<string, string>,
  col: ImportProfileMapping['columns'],
  mapping: ImportProfileMapping,
  descricao: string,
): Pick<NormalizedLancamentoRow, 'tipo_transacao' | 'saldo_pos' | 'documento_ref' | 'fatura_numero'> {
  const tipo_transacao = col.tipo_transacao
    ? String(raw[col.tipo_transacao] || '').trim() || undefined
    : undefined;
  let saldo_pos: number | undefined;
  if (col.saldo) {
    const parsed = parseMoneyValue(raw[col.saldo], mapping.decimal_format);
    if (parsed != null) saldo_pos = Math.abs(parsed);
  }
  const documento_ref = col.documento ? String(raw[col.documento] || '').trim() || undefined : undefined;
  const fatura_numero = extractFaturaNumero(descricao);
  return { tipo_transacao, saldo_pos, documento_ref, fatura_numero };
}

function shouldSkipRow(line: string, patterns: string[]): boolean {
  const lower = line.toLowerCase();
  return patterns.some((pattern) => lower.includes(pattern.toLowerCase()));
}

function buildDescricao(
  raw: Record<string, string>,
  col: ImportProfileMapping['columns'],
): string {
  const descricao = col.descricao ? String(raw[col.descricao] || '').trim() : '';
  const tipoTransacao = col.tipo_transacao
    ? String(raw[col.tipo_transacao] || '').trim()
    : col.transacao_id && col.transacao_id !== col.descricao
      ? String(raw[col.transacao_id] || '').trim()
      : '';

  if (tipoTransacao && looksLikeTransactionId(tipoTransacao)) {
    return descricao;
  }

  if (descricao && tipoTransacao && !descricao.toLowerCase().includes(tipoTransacao.toLowerCase())) {
    return `${tipoTransacao} - ${descricao}`;
  }
  return descricao || tipoTransacao;
}

function resolveRowTipoMovimento(
  raw: Record<string, string>,
  mapping: ImportProfileMapping,
  valor: number,
  descricao: string,
): TipoMovimento {
  const rule: TipoMovimentoRule = mapping.tipo_movimento_rule ?? { type: 'sign' };

  if (rule.type === 'column' && rule.column) {
    const cell = String(raw[rule.column] || '').trim();
    if (cell) {
      if (rule.entrada_values?.length) {
        const lower = cell.toLowerCase();
        if (rule.entrada_values.some((item) => lower.includes(item.toLowerCase()))) {
          return 'entrada';
        }
        return 'saida';
      }
      return tipoMovimentoFromAsaas(cell);
    }
  }

  return resolveTipoMovimento(valor, descricao);
}

function toSampleRows(rows: NormalizedLancamentoRow[]): NormalizedLancamentoSample[] {
  return rows.slice(0, 10).map((row) => ({
    transacao_id: row.transacao_id,
    data: row.data.toISOString(),
    valor: row.valor,
    descricao: row.descricao,
    pagador_nome: row.pagador_nome,
    tipo_movimento: row.tipo_movimento,
    tipo_transacao: row.tipo_transacao,
    saldo_pos: row.saldo_pos,
    documento_ref: row.documento_ref,
    fatura_numero: row.fatura_numero,
  }));
}

export function parseWithMapping(
  content: string,
  mapping: ImportProfileMapping,
): { rows: NormalizedLancamentoRow[]; errors: string[] } {
  const lines = content.split(/\r?\n/).filter((line) => line.trim().length > 0);
  const delimiter = mapping.delimiter ?? ';';
  const headers = parseDelimitedLine(lines[mapping.header_row - 1] || '', delimiter).filter(Boolean);
  const errors: string[] = [];
  const rows: NormalizedLancamentoRow[] = [];

  const col = mapping.columns;
  if (!col.data || !col.valor) {
    return { rows: [], errors: ['Mapeamento incompleto: data e valor são obrigatórios.'] };
  }

  for (let i = mapping.header_row; i < lines.length; i += 1) {
    const line = lines[i];
    if (shouldSkipRow(line, mapping.skip_row_patterns)) continue;

    const cells = parseDelimitedLine(line, delimiter);
    const raw = rowFromCells(headers, cells);

    const dataRaw = raw[col.data];
    const valorRaw = raw[col.valor];
    const data = parseDateValue(dataRaw, mapping.date_format === 'auto' ? 'DD/MM/YYYY' : mapping.date_format);
    const valor = parseMoneyValue(valorRaw, mapping.decimal_format);

    if (!data || valor == null) {
      errors.push(`Linha ${i + 1}: data ou valor inválidos.`);
      continue;
    }

    const descricao = buildDescricao(raw, col);
    const pagadorCol =
      col.pagador_nome && col.pagador_nome !== col.descricao
        ? String(raw[col.pagador_nome] || '').trim()
        : '';
    const tipo_movimento = resolveRowTipoMovimento(raw, mapping, valor, descricao);
    const pagador = resolvePagadorNome(pagadorCol || undefined, descricao, tipo_movimento);
    const enriched = enrichRowFields(raw, col, mapping, descricao);
    const transacao_id = resolveTransacaoId(raw, col, [
      data.toISOString(),
      String(valor),
      descricao,
      pagador || '',
      enriched.documento_ref || '',
    ]);

    rows.push({
      transacao_id,
      data,
      valor: Math.abs(valor),
      descricao: descricao || pagador || 'Lançamento',
      pagador_nome: pagador,
      tipo_movimento,
      ...enriched,
      json_original: raw,
    });
  }

  return { rows, errors };
}

export function mergeAnalysis(
  heuristic: ImportAnalysisResult,
  gemini: Partial<ImportAnalysisResult> | null,
): ImportAnalysisResult {
  if (!gemini?.mapping) return heuristic;

  const mergedMapping: ImportProfileMapping = { ...heuristic.mapping };
  const mergedConfidence: FieldConfidence = { ...heuristic.field_confidence };

  for (const key of [
    'data',
    'valor',
    'descricao',
    'pagador_nome',
    'transacao_id',
    'tipo_transacao',
    'saldo',
    'documento',
  ] as const) {
    const geminiConf = gemini.field_confidence?.[key] ?? 0;
    const heurConf = heuristic.field_confidence[key] ?? 0;
    if (geminiConf > heurConf && gemini.mapping.columns[key]) {
      mergedMapping.columns[key] = gemini.mapping.columns[key];
      mergedConfidence[key] = geminiConf;
    }
  }

  if ((gemini.field_confidence?.header_row ?? 0) > (heuristic.field_confidence.header_row ?? 0)) {
    mergedMapping.header_row = gemini.mapping.header_row;
    mergedConfidence.header_row = gemini.field_confidence?.header_row;
  }

  if (gemini.mapping.skip_row_patterns?.length) {
    mergedMapping.skip_row_patterns = gemini.mapping.skip_row_patterns;
  }

  return {
    ...heuristic,
    ...gemini,
    mapping: mergedMapping,
    field_confidence: mergedConfidence,
    source: 'hybrid',
    banco_label_suggested: gemini.banco_label_suggested || heuristic.banco_label_suggested,
  };
}
