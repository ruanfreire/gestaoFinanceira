import { createHash } from 'crypto';

/** Hash estável do conteúdo JSON já parseado (mesmos dados → mesmo hash). */
export function hashJsonValue(value: unknown): string {
  return createHash('sha256').update(JSON.stringify(value)).digest('hex');
}

/** Hash do texto bruto do CSV (normaliza quebras de linha). */
export function hashTextContent(content: string): string {
  const normalized = content.trim().replace(/\r\n/g, '\n');
  return createHash('sha256').update(normalized).digest('hex');
}
