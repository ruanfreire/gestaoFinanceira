export type XmlDocKind = 'cte' | 'nfe' | 'unknown_xml';

export function classifyXmlContent(bytes: Buffer, filename: string): XmlDocKind {
  const head = bytes.subarray(0, Math.min(bytes.length, 4096)).toString('utf-8');
  const lower = head.toLowerCase();

  if (lower.includes('portalfiscal.inf.br/cte') || /<cteproc/i.test(head) || /<cte[\s>]/i.test(head)) {
    if (/<nfeproc/i.test(head) || /<nfe[\s>]/i.test(head)) {
      return 'unknown_xml';
    }
    return 'cte';
  }

  if (lower.includes('portalfiscal.inf.br/nfe') || /<nfeproc/i.test(head) || /<nfe[\s>]/i.test(head)) {
    return 'nfe';
  }

  if (/\.xml$/i.test(filename) && (lower.includes('infcte') || lower.includes('<cte'))) {
    return 'cte';
  }

  if (/\.xml$/i.test(filename)) {
    return 'unknown_xml';
  }

  return 'unknown_xml';
}
