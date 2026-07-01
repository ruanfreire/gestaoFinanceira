import { PagamentoVinculoDetalhes } from './schemas/pagamento-vinculo.schema';

export type PagamentoSource = 'asaas' | 'nubank';

export function pagamentoDetalhesFromAsaas(lancamento: any): PagamentoVinculoDetalhes {
  return {
    transacao_id: lancamento.transacao_id,
    descricao: lancamento.descricao,
    pagador_nome: lancamento.pagador_nome,
    fatura_cobranca_id: lancamento.fatura_cobranca_id,
    fatura_parcelamento_id: lancamento.fatura_parcelamento_id,
    tipo_transacao: lancamento.tipo_transacao,
    tipo_lancamento: lancamento.tipo_lancamento,
    saldo_pos_lancamento: lancamento.saldo,
  };
}

export function pagamentoDetalhesFromNubank(lancamento: any): PagamentoVinculoDetalhes {
  const identificador = String(lancamento.transacao_id || '').replace(/^nubank:/, '');
  return {
    transacao_id: lancamento.transacao_id,
    descricao: lancamento.descricao,
    pagador_nome: lancamento.pagador_nome,
    categoria: lancamento.categoria,
    identificador: identificador || undefined,
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
