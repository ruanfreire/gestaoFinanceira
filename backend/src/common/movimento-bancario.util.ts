export type TipoMovimento = 'entrada' | 'saida';

export function mesCompetenciaFromLancamentoData(data: Date | string | undefined): string | undefined {
  if (!data) return undefined;
  const parsed = new Date(data);
  if (Number.isNaN(parsed.getTime())) return undefined;
  const month = String(parsed.getMonth() + 1).padStart(2, '0');
  return `${parsed.getFullYear()}-${month}`;
}

export function isAsaasEntrada(tipoLancamento?: string): boolean {
  const normalized = (tipoLancamento || '').toLowerCase();
  return normalized.includes('crédito') || normalized.includes('credito');
}

export function isAsaasSaida(tipoLancamento?: string): boolean {
  const normalized = (tipoLancamento || '').toLowerCase();
  return normalized.includes('débito') || normalized.includes('debito');
}

export function tipoMovimentoFromAsaas(tipoLancamento?: string): TipoMovimento {
  if (isAsaasSaida(tipoLancamento)) return 'saida';
  return 'entrada';
}

export function tipoMovimentoFromNubank(tipo?: string): TipoMovimento {
  return tipo === 'debito' ? 'saida' : 'entrada';
}

export function fluxoCaixaTipoFromMovimento(tipo: TipoMovimento): 'Entrada' | 'Saída' {
  return tipo === 'saida' ? 'Saída' : 'Entrada';
}

const OUTGOING_DESC_PATTERN =
  /\btransfer[eê]ncia\s+enviad[oa]\b|\bpix\s+enviad[oa]\b|\bpagamento\s+de\s+(?:fatura|boleto)\b|dinheiro\s+guardado|resgate\s+planejad/i;
const INCOMING_DESC_PATTERN = /\brecebid[oa]\b|\bdep[oó]sito\b|\bcr[eé]dito\b/i;
const FEE_DESC_PATTERN = /^taxa\s+(?:de|do)\b|^tarifa\b|mensageria/i;

/** Infere entrada/saída pela descrição quando o banco não usa sinal no valor. */
export function resolveTipoMovimento(valor: number, descricao: string): TipoMovimento {
  const text = descricao.trim();
  if (text) {
    if (FEE_DESC_PATTERN.test(text)) return 'saida';
    const outgoing = OUTGOING_DESC_PATTERN.test(text);
    const incoming = INCOMING_DESC_PATTERN.test(text);
    if (outgoing && !incoming) return 'saida';
    if (incoming && !outgoing) return 'entrada';
  }
  return valor >= 0 ? 'entrada' : 'saida';
}

export function isAsaasCobrancaRecebida(tipoTransacao?: string, tipoLancamento?: string): boolean {
  return tipoTransacao === 'Cobrança recebida' && isAsaasEntrada(tipoLancamento);
}
