import { normalizeName } from './name-match.util';

const BANK_NOISE = new Set([
  'nubank',
  'nu pagamentos',
  'asaas',
  'inter',
  'bradesco',
  'itau',
  'banco',
  'tarifa',
  'taxa',
  'iof',
  'manutencao',
  'anuidade',
  'juros',
  'rendimento',
  'desconhecido',
]);

const MASKED_DOC_PATTERN = /(?:[•*]{2,}|\*{3})[.\d]{3}[.\d]{3}[/-][•*\d-]+/i;
const BANK_SEGMENT_PATTERN = /(?:ag[eê]ncia|conta)\s*:/i;
const BANK_ENTITY_PATTERN =
  /\b(?:nu pagamentos|ita[uú]\s+unibanco|bradesco|bco\s|banco\s+bradesco|banco\s+itau)\b/i;

const INCOMING_PATTERNS = [
  /transfer[eê]ncia\s+recebid[oa]\s+pelo\s+pix\s*[-–:|]\s*(.+)$/i,
  /transfer[eê]ncia\s+recebid[oa]\s+(?:de\s+)?(.+)$/i,
  /(?:pix\s+)?recebid[oa](?:\s+pix)?\s+de\s+(.+)$/i,
  /(?:pix\s+)?recebid[oa](?:\s+pix)?\s*[-–:|]\s*(.+)$/i,
  /(?:pix\s+)?recebid[oa](?:\s+pix)?\s+(.+)$/i,
  /^ted\s+recebid[oa]\s+(?:de\s+)?(.+)$/i,
  /^cobran[cç]a\s+recebid[oa]?\s*[-–]\s*fatura\s+nr\.?\s*\d+\s+(.+)$/i,
  /^cobran[cç]a\s+recebid[oa]?\s*(?:[-–]\s*)?(?:de\s+)?(.+)$/i,
  /^pagamento\s+recebid[oa]?\s+(?:de\s+)?(.+)$/i,
  /^dep[oó]sito\s+(?:em\s+c\.?c\.?|de)?\s*(.+)$/i,
  /^credito\s+(?:de\s+)?(.+)$/i,
  /^pix\s+(?!recebid)(?!enviad)(.+)$/i,
];

const OUTGOING_PATTERNS = [
  /transfer[eê]ncia\s+enviad[oa]\s+pelo\s+pix\s*[-–:|]\s*(.+)$/i,
  /pix\s+enviad[oa]\s+para\s+(.+)$/i,
  /pagamento\s+(?:efetuado\s+)?para\s+(.+)$/i,
  /transfer[eê]ncia\s+enviad[oa]\s+(?:para\s+)?(.+)$/i,
  /ted\s+enviad[oa]\s+(?:para\s+)?(.+)$/i,
];

const INTERNAL_MOVEMENT_PATTERN =
  /dinheiro\s+guardado|resgate\s+planejad|aplicac[aã]o\s|rendimento\s|cashback\s+recebido\s*$/i;

function isNoise(name: string): boolean {
  const normalized = normalizeName(name);
  if (!normalized || normalized.length < 3) return true;
  if (BANK_NOISE.has(normalized)) return true;
  if (/^tarifa\b/.test(normalized)) return true;
  if (/^pix\s+recebid/.test(normalized)) return true;

  const words = normalized.split(' ').filter(Boolean);
  if (words.length === 1) {
    return ['pix', 'ted', 'credito', 'debito', 'transferencia', 'tarifa', 'taxa', 'pelo'].includes(words[0]);
  }
  return false;
}

function looksLikeNoiseSegment(segment: string): boolean {
  const text = segment.trim();
  if (!text) return true;
  if (MASKED_DOC_PATTERN.test(text)) return true;
  if (/^\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}$/.test(text)) return true;
  if (/^\d{3}\.\d{3}\.\d{3}-\d{2}$/.test(text)) return true;
  if (BANK_SEGMENT_PATTERN.test(text)) return true;
  if (/^pelo\s+pix$/i.test(text)) return true;
  if (BANK_ENTITY_PATTERN.test(text) && text.length > 18) return true;
  if (/^\(\d{3,4}\)/.test(text)) return true;
  return false;
}

/** Indica nome de pagador ainda com lixo bancário (precisa reextrair). */
export function isDirtyPagadorNome(value: string | undefined): boolean {
  if (!value?.trim()) return false;
  const text = value.trim();
  if (text.length > 90) return true;
  if (MASKED_DOC_PATTERN.test(text)) return true;
  if (BANK_SEGMENT_PATTERN.test(text)) return true;
  if (/\bpelo\s+pix\b/i.test(text)) return true;
  if (text.split(/\s+[-–]\s+/).length >= 2 && (BANK_ENTITY_PATTERN.test(text) || looksLikeNoiseSegment(text))) {
    return true;
  }
  return false;
}

function stripMovementPrefix(text: string): string {
  return text
    .replace(/^transfer[eê]ncia\s+(?:recebid[oa]|enviad[oa])\s+(?:pelo\s+)?(?:pix\s*)?[-–]?\s*/i, '')
    .replace(/^transfer[eê]ncia\s+(?:recebid[oa]|enviad[oa])\s*[-–]\s*/i, '')
    .replace(/^(?:pix\s+)?recebid[oa](?:\s+pix)?\s*[-–]?\s*/i, '')
    .replace(/^pix\s+enviad[oa]\s*[-–]?\s*/i, '')
    .trim();
}

/** Extrai o primeiro segmento que parece nome de pessoa/empresa (formato Nubank e similares). */
function extractNameFromDashSegments(text: string): string | undefined {
  const rest = stripMovementPrefix(text);
  if (!rest) return undefined;

  const parts = rest.split(/\s+[-–]\s+/).map((part) => part.trim()).filter(Boolean);
  for (const part of parts) {
    if (looksLikeNoiseSegment(part)) continue;
    const cleaned = cleanExtractedName(part);
    if (cleaned) return cleaned;
  }
  return undefined;
}

/** Normaliza e sanitiza nome de pagador para conciliação. */
export function sanitizePagadorNome(value: string | undefined): string | undefined {
  if (!value?.trim()) return undefined;

  const fromSegments = extractNameFromDashSegments(value);
  if (fromSegments) return fromSegments;

  return cleanExtractedName(value.trim());
}

function cleanExtractedName(raw: string): string | undefined {
  let name = raw
    .replace(/^\s*[-–|]\s*/, '')
    .replace(/^\s*de\s+/i, '')
    .replace(/^fatura\s+nr\.?\s*\d+\s*/i, '')
    .replace(/^cobran[cç]a\s+recebid[oa]?\s*[-–]\s*fatura\s+nr\.?\s*\d+\s*/i, '')
    .replace(/\s*[-–|]\s*$/g, '')
    .replace(MASKED_DOC_PATTERN, '')
    .replace(/\b(?:cpf|cnpj)\s*[*.\d/x/-]+/gi, '')
    .replace(/\b\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}\b/g, '')
    .replace(/\b\d{3}\.\d{3}\.\d{3}-\d{2}\b/g, '')
    .replace(/\b\d{11,14}\b/g, '')
    .replace(/\s*\(\d{3,4}\).*$/, '')
    .replace(/\s+ag[eê]ncia\s*:.*$/i, '')
    .replace(/\s+conta\s*:.*$/i, '')
    .replace(/\s+/g, ' ')
    .trim();

  if (!name || isNoise(name)) return undefined;
  return name;
}

function isOutgoingDescription(descricao: string): boolean {
  const text = descricao.trim();
  if (!text) return false;
  if (INTERNAL_MOVEMENT_PATTERN.test(text)) return true;
  if (/\btransfer[eê]ncia\s+enviad[oa]\b/i.test(text) && !/\brecebid[oa]\b/i.test(text)) return true;
  if (/\bpix\s+enviad[oa]\b/i.test(text) && !/\brecebid[oa]\b/i.test(text)) return true;
  if (/\bpagamento\s+de\s+(?:fatura|boleto)\b/i.test(text)) return true;
  return false;
}

function matchPatterns(descricao: string, patterns: RegExp[]): string | undefined {
  const text = descricao.trim();
  if (!text) return undefined;

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (!match?.[1]) continue;
    const fromSegments = extractNameFromDashSegments(match[1]);
    if (fromSegments) return fromSegments;
    const cleaned = cleanExtractedName(match[1]);
    if (cleaned) return cleaned;
  }
  return undefined;
}

function extractFromSegments(descricao: string): string | undefined {
  if (!descricao.includes('|')) return undefined;
  const segments = descricao
    .split('|')
    .map((part) => part.trim())
    .filter(Boolean);
  for (let i = segments.length - 1; i >= 0; i -= 1) {
    const fromSegment = extractPagadorFromDescricao(segments[i]);
    if (fromSegment) return fromSegment;
    const cleaned = cleanExtractedName(segments[i]);
    if (cleaned) return cleaned;
  }
  return undefined;
}

/** Extrai nome de empresa/pessoa embutido na descrição do extrato. */
export function extractPagadorFromDescricao(
  descricao: string,
  tipoMovimento: 'entrada' | 'saida' = 'entrada',
): string | undefined {
  const text = descricao?.trim();
  if (!text) return undefined;
  if (tipoMovimento === 'saida' || isOutgoingDescription(text)) return undefined;

  const fromPipe = extractFromSegments(text);
  if (fromPipe) return fromPipe;

  const fromPattern = matchPatterns(text, INCOMING_PATTERNS);
  if (fromPattern) return fromPattern;

  const fromDash = extractNameFromDashSegments(text);
  if (fromDash) return fromDash;

  return undefined;
}

/** Usa coluna dedicada quando preenchida; senão varre a descrição. */
export function resolvePagadorNome(
  pagadorFromColumn: string | undefined,
  descricao: string,
  tipoMovimento: 'entrada' | 'saida' = 'entrada',
): string | undefined {
  const extracted = extractPagadorFromDescricao(descricao, tipoMovimento);
  const fromColumn = pagadorFromColumn?.trim();

  if (fromColumn && fromColumn !== descricao.trim()) {
    const sanitizedColumn = sanitizePagadorNome(fromColumn);
    if (sanitizedColumn && !isDirtyPagadorNome(sanitizedColumn)) {
      return sanitizedColumn;
    }
  }

  return extracted ? sanitizePagadorNome(extracted) : undefined;
}
