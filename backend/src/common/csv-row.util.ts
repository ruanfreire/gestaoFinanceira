/** Monta objeto linha preservando colunas extras além do cabeçalho. */
export function buildRawRow(headers: string[], cells: string[]): Record<string, string> {
  const row: Record<string, string> = {};
  headers.forEach((header, index) => {
    if (!header) return;
    row[header] = cells[index] ?? '';
  });

  if (cells.length > headers.length) {
    for (let i = headers.length; i < cells.length; i += 1) {
      row[`_extra_${i - headers.length + 1}`] = cells[i] ?? '';
    }
  }

  return row;
}

const FATURA_NUMERO_PATTERN = /fatura\s+nr\.?\s*(\d+)/i;

export function extractFaturaNumero(text: string | undefined): string | undefined {
  const match = text?.match(FATURA_NUMERO_PATTERN);
  return match?.[1];
}

const ID_VALUE_PATTERN = /^[a-f0-9-]{8,}$/i;

export function looksLikeTransactionId(value: string | undefined): boolean {
  const text = value?.trim();
  if (!text) return false;
  if (ID_VALUE_PATTERN.test(text)) return true;
  if (/^\d{12,}$/.test(text)) return true;
  if (/^[A-Z0-9]{6,}$/i.test(text) && !/\s/.test(text) && text.length <= 32) return true;
  return false;
}

export function looksLikeTransactionType(value: string | undefined): boolean {
  const text = value?.trim();
  if (!text) return false;
  if (looksLikeTransactionId(text)) return false;
  return /cobran|pix|taxa|tarifa|transfer|ted|boleto|debito|credito|pagamento|receb/i.test(text);
}
