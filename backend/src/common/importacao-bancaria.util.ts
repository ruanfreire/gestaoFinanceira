export type BancoImportacao = 'bank';

export type NotaVinculoResumo = {
  _id: string;
  numero?: string;
  tomador?: string;
  mes_competencia?: string;
};

export type BankLancamentoDetalhe = {
  banco: 'bank';
  _id: string;
  importacao_id?: string;
  profile_id?: string;
  transacao_id?: string;
  data?: string;
  descricao?: string;
  valor?: number;
  pagador_nome?: string;
  pagador_nome_normalizado?: string;
  tipo_movimento?: 'entrada' | 'saida';
  status_conciliacao?: string;
  nota_id?: string;
  nota?: NotaVinculoResumo | null;
  candidatas_nota_ids?: string[];
  json_original?: Record<string, unknown>;
  createdAt?: string;
  updatedAt?: string;
};

export type LancamentoBancarioDetalhe = BankLancamentoDetalhe;

function isoDate(value: unknown): string | undefined {
  if (!value) return undefined;
  const date = new Date(value as string | Date);
  if (Number.isNaN(date.getTime())) return undefined;
  return date.toISOString();
}

function mapNotaResumo(nota: any): NotaVinculoResumo | null {
  if (!nota) return null;
  return {
    _id: String(nota._id),
    numero: nota.numero,
    tomador: nota.tomador,
    mes_competencia: nota.mes_competencia,
  };
}

export function mapBankLancamentoDetalhe(lancamento: any): BankLancamentoDetalhe {
  const original = (lancamento.json_original || {}) as Record<string, unknown>;
  const notaPopulated =
    lancamento.nota_id && typeof lancamento.nota_id === 'object' ? lancamento.nota_id : null;
  return {
    banco: 'bank',
    _id: String(lancamento._id),
    importacao_id: lancamento.importacao_id ? String(lancamento.importacao_id) : undefined,
    profile_id: lancamento.profile_id ? String(lancamento.profile_id) : undefined,
    transacao_id: lancamento.transacao_id,
    data: isoDate(lancamento.data),
    descricao: lancamento.descricao,
    valor: lancamento.valor,
    pagador_nome: lancamento.pagador_nome,
    pagador_nome_normalizado: lancamento.pagador_nome_normalizado,
    tipo_movimento: lancamento.tipo_movimento,
    status_conciliacao: lancamento.status_conciliacao,
    nota_id: notaPopulated
      ? String(notaPopulated._id)
      : lancamento.nota_id
        ? String(lancamento.nota_id)
        : undefined,
    nota: mapNotaResumo(notaPopulated),
    candidatas_nota_ids: (lancamento.candidatas_nota_ids || []).map((id: unknown) => String(id)),
    json_original: original,
    createdAt: isoDate(lancamento.createdAt),
    updatedAt: isoDate(lancamento.updatedAt),
  };
}

/** @deprecated use mapBankLancamentoDetalhe */
export const mapCustomLancamentoDetalhe = mapBankLancamentoDetalhe;

export function sanitizeImportacaoBancaria(doc: any, includeCsv = false) {
  if (!doc) return null;
  const plain = typeof doc.toObject === 'function' ? doc.toObject() : { ...doc };
  if (!includeCsv) delete plain.originalCsv;
  return plain;
}

export function withBancoTag<T extends Record<string, unknown>>(
  doc: T,
  banco: BancoImportacao = 'bank',
  extra?: Record<string, unknown>,
) {
  return { ...doc, banco, ...extra };
}
