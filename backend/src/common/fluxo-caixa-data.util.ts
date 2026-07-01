import { Types } from 'mongoose';
import type { FluxoCaixaRow } from './fluxo-caixa.export';
import {
  fluxoCaixaTipoFromMovimento,
  mesCompetenciaFromLancamentoData,
  type TipoMovimento,
} from './movimento-bancario.util';
import { FLUXO_CAIXA_CATEGORIAS, resolveFluxoCaixaCategoria } from './fluxo-caixa-lista';

type LancamentoFluxo = {
  data?: Date | string;
  nota_id?: unknown;
  pagador_nome?: string;
  descricao?: string;
  valor?: number;
  categoria?: string;
  tipo_movimento?: TipoMovimento;
  tipo_transacao?: string;
  tipo_lancamento?: string;
};

type NotaResumo = {
  _id: unknown;
  numero?: string;
  tomador?: string;
  codigo_servico?: string;
  mes_competencia?: string;
  empresa_nome?: string;
  empresa_cnpj?: string;
};

/** IDs de nota válidos para consulta MongoDB (ignora null/undefined e strings inválidas). */
export function collectValidNotaIds(lancamentos: { nota_id?: unknown }[]): string[] {
  const ids = new Set<string>();
  for (const item of lancamentos) {
    const raw = item.nota_id;
    if (raw == null) continue;
    const id = String(raw);
    if (!Types.ObjectId.isValid(id)) continue;
    ids.add(id);
  }
  return [...ids];
}

export function buildDateFilter(from?: string, to?: string): Record<string, Date> | undefined {
  if (!from && !to) return undefined;
  const dataFilter: Record<string, Date> = {};
  if (from) {
    dataFilter.$gte = new Date(`${from}T00:00:00.000Z`);
  }
  if (to) {
    dataFilter.$lte = new Date(`${to}T23:59:59.999Z`);
  }
  return dataFilter;
}

/** Converte mês de pagamento ou intervalo explícito em from/to (datas do extrato). */
export function resolveExportDateRange(params: {
  from?: string;
  to?: string;
  mes_pagamento?: string;
  mes_competencia?: string;
}): { from?: string; to?: string } {
  const mes = params.mes_pagamento?.trim() || params.mes_competencia?.trim();
  if (mes && /^\d{4}-\d{2}$/.test(mes)) {
    const [year, month] = mes.split('-').map(Number);
    const lastDay = new Date(year, month, 0).getDate();
    return {
      from: `${year}-${String(month).padStart(2, '0')}-01`,
      to: `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`,
    };
  }
  return { from: params.from?.trim(), to: params.to?.trim() };
}

export function extractFaturaIdFromDescricao(descricao?: string): string | undefined {
  const match = descricao?.match(/fatura\s*nr\.?\s*(\d+)/i);
  return match?.[1];
}

/**
 * Por competência: apenas lançamentos das NFs do mês (+ taxas Asaas da mesma fatura).
 * Não inclui Pix, pagamentos de conta nem outros movimentos só por data do extrato.
 */
export function filterLancamentosForFluxoCaixaExport<
  T extends { nota_id?: unknown; data?: Date | string; descricao?: string },
>(lancamentos: T[], mesCompetencia: string | undefined, notaById: Map<string, NotaResumo>): T[] {
  if (!mesCompetencia) return lancamentos;

  const notaIdsDaCompetencia = new Set(
    [...notaById.entries()]
      .filter(([, nota]) => nota.mes_competencia === mesCompetencia)
      .map(([id]) => id),
  );

  const principais: T[] = [];
  const cobrancaFaturaIds = new Set<string>();

  for (const lancamento of lancamentos) {
    if (!lancamento.nota_id) continue;
    const notaId = String(lancamento.nota_id);
    if (!notaIdsDaCompetencia.has(notaId)) continue;
    principais.push(lancamento);
    const faturaId = extractFaturaIdFromDescricao(lancamento.descricao);
    if (faturaId) cobrancaFaturaIds.add(faturaId);
  }

  const taxasRelacionadas = lancamentos.filter((lancamento) => {
    if (lancamento.nota_id) return false;
    const faturaId = extractFaturaIdFromDescricao(lancamento.descricao);
    return faturaId != null && cobrancaFaturaIds.has(faturaId);
  });

  return [...principais, ...taxasRelacionadas];
}

type LancamentoComOrigem = {
  origem?: string;
  nota_id?: unknown;
  data?: Date | string;
  descricao?: string;
};

/** Separa conta corrente (NF/taxas) e cartão Nubank (por mês da compra). */
export function splitNubankLancamentosFluxoCaixa<T extends LancamentoComOrigem>(
  lancamentos: T[],
  mesCompetencia: string | undefined,
  notaById: Map<string, NotaResumo>,
): { conta: T[]; cartao: T[] } {
  const cartaoSource = lancamentos.filter((item) => item.origem === 'cartao');
  const contaSource = lancamentos.filter((item) => item.origem !== 'cartao');

  const conta = filterLancamentosForFluxoCaixaExport(contaSource, mesCompetencia, notaById);

  let cartao = cartaoSource;
  if (mesCompetencia) {
    cartao = cartaoSource.filter(
      (item) => mesCompetenciaFromLancamentoData(item.data) === mesCompetencia,
    );
  }

  return { conta, cartao };
}

/** @deprecated use filterLancamentosForFluxoCaixaExport na exportação de fluxo de caixa */
export function filterLancamentosByCompetencia<T extends { nota_id?: unknown; data?: Date | string }>(
  lancamentos: T[],
  mesCompetencia: string | undefined,
  notaById: Map<string, NotaResumo>,
): T[] {
  if (!mesCompetencia) return lancamentos;
  return lancamentos.filter((lancamento) => {
    if (lancamento.nota_id) {
      const nota = notaById.get(String(lancamento.nota_id));
      if (nota?.mes_competencia === mesCompetencia) return true;
    }
    return mesCompetenciaFromLancamentoData(lancamento.data) === mesCompetencia;
  });
}

export function enrichHeaderFromNotas(
  header: { empresaNome: string; empresaCnpj: string },
  notas: NotaResumo[],
) {
  if (header.empresaNome && header.empresaCnpj) return;
  const withEmpresa = notas.find((nota) => nota.empresa_nome || nota.empresa_cnpj);
  if (!withEmpresa) return;
  if (!header.empresaNome && withEmpresa.empresa_nome) {
    header.empresaNome = withEmpresa.empresa_nome;
  }
  if (!header.empresaCnpj && withEmpresa.empresa_cnpj) {
    header.empresaCnpj = withEmpresa.empresa_cnpj;
  }
}

export function mapLancamentosToFluxoCaixaRows(
  lancamentos: LancamentoFluxo[],
  notaById: Map<string, NotaResumo>,
  getHistorico: (lancamento: LancamentoFluxo) => string,
  getCategoriaExtra?: (lancamento: LancamentoFluxo) => string | undefined,
  getTipoMovimento?: (lancamento: LancamentoFluxo) => TipoMovimento,
): { rows: FluxoCaixaRow[]; categorias: string[] } {
  const categorias = new Set<string>(FLUXO_CAIXA_CATEGORIAS);
  const rows: FluxoCaixaRow[] = [];

  for (const lancamento of lancamentos) {
    if (!lancamento.data) continue;
    const nota = lancamento.nota_id ? notaById.get(String(lancamento.nota_id)) : undefined;
    const tipoMovimento = getTipoMovimento?.(lancamento) || lancamento.tipo_movimento || 'entrada';
    const tipo = fluxoCaixaTipoFromMovimento(tipoMovimento);
    const historico = getHistorico(lancamento);
    const rawCategoria =
      nota?.codigo_servico || getCategoriaExtra?.(lancamento) || lancamento.categoria;
    const categoria = resolveFluxoCaixaCategoria(tipo, rawCategoria, historico);
    categorias.add(categoria);

    rows.push({
      data: new Date(lancamento.data),
      tipo,
      categoria,
      numeroDocumento: nota?.numero ? String(nota.numero) : '',
      clienteFornecedor: nota?.tomador || lancamento.pagador_nome || '',
      historico,
      valor: Math.abs(Number(lancamento.valor) || 0),
    });
  }

  return { rows, categorias: [...categorias] };
}

/** @deprecated use mapLancamentosToFluxoCaixaRows */
export function mapConciliadosToFluxoCaixaRows(
  lancamentos: LancamentoFluxo[],
  notaById: Map<string, NotaResumo>,
  getHistorico: (lancamento: LancamentoFluxo) => string,
  getCategoriaExtra?: (lancamento: LancamentoFluxo) => string | undefined,
): { rows: FluxoCaixaRow[]; categorias: string[] } {
  return mapLancamentosToFluxoCaixaRows(lancamentos, notaById, getHistorico, getCategoriaExtra);
}
