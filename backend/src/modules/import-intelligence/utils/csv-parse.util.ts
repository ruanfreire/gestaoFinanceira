export function parseDelimitedLine(
  line: string,
  delimiter: ',' | ';' | '\t' = ';',
): string[] {
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
    if (char === delimiter && !inQuotes) {
      cells.push(current.trim());
      current = '';
      continue;
    }
    current += char;
  }
  cells.push(current.trim());
  return cells;
}

/** @deprecated Prefer parseDelimitedLine when the delimiter is known. */
export function parseCsvLine(line: string): string[] {
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
    if ((char === ',' || char === ';') && !inQuotes) {
      cells.push(current.trim());
      current = '';
      continue;
    }
    current += char;
  }
  cells.push(current.trim());
  return cells;
}

export function normalizeHeader(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

export function detectDelimiter(sampleLines: string[]): ',' | ';' | '\t' {
  const counts = {
    ';': 0,
    ',': 0,
    '\t': 0,
  };

  for (const line of sampleLines) {
    if (!line.trim()) continue;
    counts[';'] += (line.match(/;/g) || []).length;
    counts[','] += (line.match(/,/g) || []).length;
    counts['\t'] += (line.match(/\t/g) || []).length;
  }

  if (counts[';'] >= counts[','] && counts[';'] >= counts['\t'] && counts[';'] > 0) return ';';
  if (counts['\t'] > counts[',']) return '\t';
  return ',';
}

export function parseDateValue(value: string | undefined, format: 'DD/MM/YYYY' | 'YYYY-MM-DD' | 'auto'): Date | null {
  const trimmed = value?.trim() ?? '';
  if (!trimmed) return null;

  if (format === 'YYYY-MM-DD' || format === 'auto') {
    const iso = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (iso) return new Date(Number(iso[1]), Number(iso[2]) - 1, Number(iso[3]));
  }

  const br = trimmed.match(/^(\d{2})\/(\d{2})\/(\d{4})/);
  if (br) return new Date(Number(br[3]), Number(br[2]) - 1, Number(br[1]));

  const parsed = new Date(trimmed);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export function parseMoneyValue(value: string, format: 'br' | 'us'): number | null {
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

  let normalized = trimmed;
  if (format === 'br') {
    normalized = trimmed.replace(/\./g, '').replace(',', '.');
  } else {
    normalized = trimmed.replace(/,/g, '');
  }

  const parsed = Number.parseFloat(normalized.replace(/[^\d.-]/g, ''));
  if (!Number.isFinite(parsed)) return null;
  return negative ? -Math.abs(parsed) : parsed;
}

export function hashRow(parts: string[]): string {
  const raw = parts.join('|');
  let hash = 0;
  for (let i = 0; i < raw.length; i += 1) {
    hash = (hash << 5) - hash + raw.charCodeAt(i);
    hash |= 0;
  }
  return `gen-${Math.abs(hash)}`;
}

export function sanitizeSampleValue(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return '';
  if (/^\d{11,14}$/.test(trimmed.replace(/\D/g, ''))) return '[documento]';
  if (/^[\d.,]+$/.test(trimmed)) return '[valor]';
  if (trimmed.length > 3) return `${trimmed.slice(0, 2)}***`;
  return '***';
}
