/** Tenta corrigir bytes de XML antes do parse (encoding, chave com espaços). */
export function correctXmlBytes(bytes: Buffer): { bytes: Buffer; corrections: string[] } {
  const corrections: string[] = [];
  let text = bytes.toString('utf-8');

  if (!text.includes('<') && bytes.length > 0) {
    const latin = bytes.toString('latin1');
    if (latin.includes('<')) {
      text = latin;
      corrections.push('reencoded_latin1');
    }
  }

  if (/\bId="CTe\s+/.test(text) || /chave>\s*\d/.test(text)) {
    text = text.replace(/(Id="CTe)\s+/g, '$1').replace(/(<chave>)\s*(\d)/g, '$1$2');
    corrections.push('trim_chave_whitespace');
  }

  return { bytes: Buffer.from(text, 'utf-8'), corrections };
}
