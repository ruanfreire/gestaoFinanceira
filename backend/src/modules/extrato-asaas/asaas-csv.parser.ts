export type AsaasCsvRow = {
  data: Date;
  transacao_id: string;
  tipo_transacao: string;
  transacao_estornada: boolean;
  descricao: string;
  valor: number;
  saldo: number | null;
  fatura_parcelamento_id?: string;
  fatura_cobranca_id?: string;
  nota_fiscal_ref?: string;
  wallet?: string;
  tipo_lancamento: string;
  pagador_nome?: string;
};

export type AsaasCsvMeta = {
  periodo?: string;
  saldo_inicial?: number;
  saldo_final?: number;
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
    current += char;
  }
  cells.push(current);
  return cells.map((cell) => cell.trim());
}

function parseDateBR(value: string): Date | null {
  const match = value.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!match) return null;
  const [, day, month, year] = match;
  return new Date(Number(year), Number(month) - 1, Number(day));
}

function parseDecimal(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const parsed = Number.parseFloat(trimmed.replace(',', '.'));
  return Number.isFinite(parsed) ? parsed : null;
}

function isSaldoRow(cells: string[]): boolean {
  const label = cells[4]?.toLowerCase() || '';
  return label.includes('saldo inicial') || label.includes('saldo final');
}

function isPeriodRow(cells: string[]): boolean {
  return cells.some((cell) => cell.toLowerCase().includes('período a partir de'));
}

export function parseAsaasCsv(content: string): { meta: AsaasCsvMeta; rows: AsaasCsvRow[] } {
  const lines = content.split(/\r?\n/).filter((line) => line.trim().length > 0);
  const meta: AsaasCsvMeta = {};
  const rows: AsaasCsvRow[] = [];

  for (const line of lines) {
    const cells = parseCsvLine(line);
    if (cells.length < 6) continue;

    if (isPeriodRow(cells)) {
      meta.periodo = cells.find((cell) => cell.toLowerCase().includes('período')) || undefined;
      continue;
    }

    if (cells[0] === 'Data' && cells[1] === 'Transação') {
      continue;
    }

    if (isSaldoRow(cells)) {
      const saldo = parseDecimal(cells[6] || cells[5] || '');
      const label = (cells[4] || '').toLowerCase();
      if (label.includes('inicial')) meta.saldo_inicial = saldo ?? undefined;
      if (label.includes('final')) meta.saldo_final = saldo ?? undefined;
      continue;
    }

    const data = parseDateBR(cells[0]);
    const transacaoId = cells[1];
    if (!data || !transacaoId) continue;

    const descricao = cells[4] || '';
    const valor = parseDecimal(cells[5]);
    if (valor == null) continue;

    rows.push({
      data,
      transacao_id: transacaoId,
      tipo_transacao: cells[2] || '',
      transacao_estornada: Boolean(cells[3]),
      descricao,
      valor,
      saldo: parseDecimal(cells[6] || ''),
      fatura_parcelamento_id: cells[7] || undefined,
      fatura_cobranca_id: cells[8] || undefined,
      nota_fiscal_ref: cells[9] || undefined,
      wallet: cells[10] || undefined,
      tipo_lancamento: cells[11] || '',
      pagador_nome: extractPayerFromDescription(descricao),
    });
  }

  return { meta, rows };
}

function extractPayerFromDescription(descricao: string): string | undefined {
  const match = descricao.match(/fatura nr\.\s*\d+\s+(.+)$/i);
  return match?.[1]?.trim() || undefined;
}
