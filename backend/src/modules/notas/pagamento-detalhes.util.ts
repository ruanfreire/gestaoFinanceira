import { PagamentoVinculoDetalhes } from './schemas/pagamento-vinculo.schema';

export type PagamentoSource = 'bank';

export function pagamentoDetalhesFromLancamento(lancamento: {
  transacao_id?: string;
  descricao?: string;
  pagador_nome?: string;
  json_original?: Record<string, unknown>;
}): PagamentoVinculoDetalhes {
  const original = lancamento.json_original || {};
  return {
    transacao_id: lancamento.transacao_id,
    descricao: lancamento.descricao,
    pagador_nome: lancamento.pagador_nome,
    fatura_cobranca_id: original.fatura_cobranca_id ? String(original.fatura_cobranca_id) : undefined,
    fatura_parcelamento_id: original.fatura_parcelamento_id
      ? String(original.fatura_parcelamento_id)
      : undefined,
    tipo_transacao: original.tipo_transacao ? String(original.tipo_transacao) : undefined,
    tipo_lancamento: original.tipo_lancamento ? String(original.tipo_lancamento) : undefined,
    categoria: original.categoria ? String(original.categoria) : undefined,
    identificador: original.identificador ? String(original.identificador) : undefined,
    saldo_pos_lancamento:
      typeof original.saldo === 'number' ? original.saldo : (lancamento as { saldo?: number }).saldo,
  };
}

export function buildPagamentoEntry(
  source: PagamentoSource,
  lancamentoId: string,
  valor: number,
  data: Date,
  detalhes?: PagamentoVinculoDetalhes,
) {
  return {
    source,
    lancamento_id: lancamentoId,
    valor,
    data,
    ...detalhes,
  };
}
