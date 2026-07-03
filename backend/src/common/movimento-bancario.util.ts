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
  /\btransfer[eê]ncia\s+enviad[oa]\b|\bpix\s+enviad[oa]\b|\bpagamento\s+de\s+(?:fatura|boleto|conta)\b|\bpagamento\s+efetuado\b|dinheiro\s+guardado|resgate\s+planejad/i;
const INCOMING_DESC_PATTERN =
  /\brecebid[oa]\b|\bdep[oó]sito\b|\bcr[eé]dito\b|\bcobran[cç]a\s+recebid[oa]\b/i;
const FEE_DESC_PATTERN = /^taxa\s+(?:de|do)\b|^tarifa\b|mensageria|taxa\s+asaas/i;

const OUTGOING_TX_PATTERN =
  /\btransfer[eê]ncia\s+enviad|\btransfer[eê]ncia\s+para\s+conta|\bpix\s+enviad|\btaxa\b|\btarifa\b|mensageria|\bd[eé]bito\b|\bsaque\b|\bpagamento\s+de\s+conta/i;
const INCOMING_TX_PATTERN =
  /\bcobran[cç]a\s+recebid|\btransfer[eê]ncia\s+recebid|\bpix\s+recebid|\bestorno\b|\bcr[eé]dito\b|\brecebimento\b/i;

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
  if (tipoTransacao === 'Cobrança recebida') {
    return !tipoLancamento || isAsaasEntrada(tipoLancamento);
  }
  return false;
}

export function isCobrancaRecebidaDescricao(descricao?: string): boolean {
  return /\bcobran[cç]a\s+recebid[oa]\b/i.test(descricao?.trim() ?? '');
}

export function isCobrancaRecebidaLancamento(input: {
  descricao?: string;
  tipo_transacao?: string;
}): boolean {
  if (isCobrancaRecebidaDescricao(input.descricao)) return true;
  const tipoTx = input.tipo_transacao?.trim() ?? '';
  if (!tipoTx) return false;
  if (isAsaasCobrancaRecebida(tipoTx)) return true;
  return INCOMING_TX_PATTERN.test(tipoTx);
}

/** Reclassifica entrada/saída na exportação (corrige importações antigas do Asaas). */
export function resolveLancamentoTipoMovimento(input: {
  valor?: number;
  descricao?: string;
  tipo_movimento?: TipoMovimento;
  tipo_transacao?: string;
  tipo_lancamento?: string;
}): TipoMovimento {
  const descricao = input.descricao?.trim() ?? '';
  const valor = Number(input.valor ?? 0);
  const tipoTx = input.tipo_transacao?.trim() ?? '';
  const tipoLanc = input.tipo_lancamento?.trim() ?? '';

  if (tipoLanc) {
    if (isAsaasSaida(tipoLanc)) return 'saida';
    if (isAsaasEntrada(tipoLanc)) return 'entrada';
  }

  if (tipoTx) {
    if (OUTGOING_TX_PATTERN.test(tipoTx)) return 'saida';
    if (INCOMING_TX_PATTERN.test(tipoTx)) return 'entrada';
    if (isAsaasCobrancaRecebida(tipoTx, tipoLanc)) return 'entrada';
  }

  const inferred = resolveTipoMovimento(valor, descricao);
  if (input.tipo_movimento === 'entrada' || input.tipo_movimento === 'saida') {
    if (inferred !== input.tipo_movimento) {
      return inferred;
    }
    return input.tipo_movimento;
  }

  return inferred;
}
