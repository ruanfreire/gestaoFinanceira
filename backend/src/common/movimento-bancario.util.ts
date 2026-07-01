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

export function isAsaasCobrancaRecebida(tipoTransacao?: string, tipoLancamento?: string): boolean {
  return tipoTransacao === 'Cobrança recebida' && isAsaasEntrada(tipoLancamento);
}
