export type NubankCsvRow = {
  data: Date;
  transacao_id: string;
  descricao: string;
  valor: number;
  categoria?: string;
  tipo: 'credito' | 'debito';
  origem: 'conta' | 'cartao';
  pagador_nome?: string;
};

export type NubankCsvMeta = {
  periodo?: string;
  formato?: 'conta' | 'cartao';
  total_linhas_arquivo?: number;
};

function parseCsvLine(line: string): string[] {
  const cells: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }
    if (char === ',' && !inQuotes) {
      cells.push(current);
      current = '';
      continue;
    }
    if (char === ';' && !inQuotes) {
      cells.push(current);
      current = '';
      continue;
    }
    current += char;
  }
  cells.push(current);
  return cells.map((cell) => cell.trim());
}

function normalizeHeader(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

function parseDateBR(value: string): Date | null {
  const match = value.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!match) return null;
  const [, day, month, year] = match;
  return new Date(Number(year), Number(month) - 1, Number(day));
}

function parseDateISO(value: string): Date | null {
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!match) return null;
  const [, year, month, day] = match;
  return new Date(Number(year), Number(month) - 1, Number(day));
}

function parseMoney(value: string): number | null {
  let trimmed = value.trim();
  if (!trimmed) return null;

  let negative = false;
  if (/^\(.*\)$/.test(trimmed)) {
    negative = true;
    trimmed = trimmed.slice(1, -1);
  }
  if (trimmed.startsWith('-')) {
    negative = true;
    trimmed = trimmed.slice(1);
  }

  trimmed = trimmed.replace(/R\$\s?/gi, '').replace(/\s/g, '');
  if (trimmed.includes(',') && trimmed.includes('.')) {
    trimmed = trimmed.replace(/\./g, '').replace(',', '.');
  } else if (trimmed.includes(',')) {
    trimmed = trimmed.replace(',', '.');
  }

  const parsed = Number.parseFloat(trimmed);
  if (!Number.isFinite(parsed)) return null;
  return negative ? -Math.abs(parsed) : parsed;
}

function buildTransacaoId(identificador: string | undefined, data: Date, valor: number, descricao: string): string {
  if (identificador?.trim()) {
    return `nubank:${identificador.trim()}`;
  }
  const day = [
    data.getFullYear(),
    String(data.getMonth() + 1).padStart(2, '0'),
    String(data.getDate()).padStart(2, '0'),
  ].join('-');
  const slug = descricao.replace(/\s+/g, ' ').trim().slice(0, 120);
  return `nubank:${day}:${Math.abs(valor).toFixed(2)}:${slug}`;
}

export function extractPayerFromNubankDescription(descricao: string): string | undefined {
  const text = descricao.trim();
  if (!text) return undefined;

  const patterns = [
    /transfer[eê]ncia recebida(?: pelo pix)?\s*[-–—]\s*(.+?)(?:\s*[-–—]\s*[•*\d.]|\s*$)/i,
    /transfer[eê]ncia recebida pelo pix\s*[-–—]\s*(.+)$/i,
    /pix recebid[oa]\s+(?:de\s+)?(.+?)(?:\s*[-–—]\s*|\s*$)/i,
    /transfer[eê]ncia recebida\s*[-–—]\s*(.+)$/i,
    /recebido de\s+(.+?)(?:\s*[-–—]\s*|\s*$)/i,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    const name = match?.[1]?.trim();
    if (name && name.length > 2) return name;
  }

  return undefined;
}

function isIncomingCredit(descricao: string, valor: number, origem: NubankCsvRow['origem']): boolean {
  if (valor <= 0) return false;

  const d = descricao.toLowerCase();
  if (
    /pagamento de boleto|compra no|compra em|debito|enviad|saque|aplicacao|investimento|tarifa|iof|juros|anuidade|dinheiro guardado|resgate planejado/.test(
      d,
    )
  ) {
    return false;
  }

  if (/recebid|estorno|devolu|credito|deposito|ted recebid|pix recebid/.test(d)) {
    return true;
  }

  if (origem === 'conta' && /transfer[eê]ncia recebida/.test(d)) {
    return true;
  }

  return origem === 'conta' && valor > 0 && !/compra|pagamento|debito|enviad/.test(d);
}

type ColumnMap = {
  data?: number;
  descricao?: number;
  valor?: number;
  identificador?: number;
  categoria?: number;
  title?: number;
  amount?: number;
  estabelecimento?: number;
};

function detectColumns(headers: string[]): { map: ColumnMap; origem: 'conta' | 'cartao' } {
  const normalized = headers.map(normalizeHeader);
  const map: ColumnMap = {};

  normalized.forEach((header, index) => {
    if (header === 'data' || header === 'date') map.data = index;
    if (header === 'descricao' || header === 'description') map.descricao = index;
    if (header === 'valor' || header === 'value') map.valor = index;
    if (header === 'identificador' || header === 'identifier' || header === 'id') map.identificador = index;
    if (header === 'title') map.title = index;
    if (header === 'amount') map.amount = index;
    if (header === 'category' || header === 'categoria') map.categoria = index;
    if (header === 'estabelecimento') map.estabelecimento = index;
  });

  const origem =
    map.title != null || map.estabelecimento != null || map.amount != null ? 'cartao' : 'conta';

  return { map, origem };
}

function parseRow(cells: string[], map: ColumnMap, origem: 'conta' | 'cartao'): NubankCsvRow | null {
  const dataRaw = map.data != null ? cells[map.data] : '';
  const data = parseDateBR(dataRaw) ?? parseDateISO(dataRaw);
  if (!data) return null;

  const descricao =
    (map.descricao != null ? cells[map.descricao] : '') ||
    (map.title != null ? cells[map.title] : '') ||
    (map.estabelecimento != null ? cells[map.estabelecimento] : '');
  if (!descricao.trim()) return null;

  const valorRaw =
    (map.valor != null ? cells[map.valor] : '') || (map.amount != null ? cells[map.amount] : '');
  const signedValor = parseMoney(valorRaw);
  if (signedValor == null || signedValor === 0) return null;

  const identificador = map.identificador != null ? cells[map.identificador]?.trim() : undefined;
  const categoria = map.categoria != null ? cells[map.categoria] : undefined;
  const absValor = Math.abs(signedValor);
  const tipo: NubankCsvRow['tipo'] = signedValor > 0 ? 'credito' : 'debito';

  return {
    data,
    transacao_id: buildTransacaoId(identificador, data, absValor, descricao),
    descricao: descricao.trim(),
    valor: absValor,
    categoria: categoria?.trim() || undefined,
    tipo,
    origem,
    pagador_nome: extractPayerFromNubankDescription(descricao),
  };
}

export function parseNubankCsv(content: string): { meta: NubankCsvMeta; rows: NubankCsvRow[] } {
  const lines = content.split(/\r?\n/).filter((line) => line.trim().length > 0);
  const meta: NubankCsvMeta = { total_linhas_arquivo: lines.length };
  const rows: NubankCsvRow[] = [];

  let columnMap: ColumnMap | null = null;
  let origem: 'conta' | 'cartao' = 'conta';

  for (const line of lines) {
    const cells = parseCsvLine(line);
    if (cells.length < 2) continue;

    const first = normalizeHeader(cells[0]);
    if (!columnMap && (first === 'data' || first === 'date')) {
      const detected = detectColumns(cells);
      columnMap = detected.map;
      origem = detected.origem;
      meta.formato = origem;
      continue;
    }

    if (!columnMap) continue;

    const row = parseRow(cells, columnMap, origem);
    if (!row) continue;

    rows.push(row);
  }

  if (rows.length > 0) {
    const first = rows[0].data;
    const last = rows[rows.length - 1].data;
    meta.periodo = `${first.toLocaleDateString('pt-BR')} — ${last.toLocaleDateString('pt-BR')}`;
  }

  return { meta, rows };
}
