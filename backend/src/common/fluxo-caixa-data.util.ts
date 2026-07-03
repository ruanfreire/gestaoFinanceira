import { Types } from 'mongoose';
import type { FluxoCaixaRow } from './fluxo-caixa.export';
import {
  fluxoCaixaTipoFromMovimento,
  isCobrancaRecebidaLancamento,
  mesCompetenciaFromLancamentoData,
  resolveLancamentoTipoMovimento,
  type TipoMovimento,
} from './movimento-bancario.util';
import { FLUXO_CAIXA_CATEGORIAS, resolveFluxoCaixaCategoria, resolveFluxoCaixaCategoriaCartao } from './fluxo-caixa-lista';

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
  data_emissao?: Date | string;
  empresa_nome?: string;
  empresa_cnpj?: string;
};

function notaMatchesMesCompetencia(nota: NotaResumo, mesCompetencia: string): boolean {
  if (nota.mes_competencia === mesCompetencia) return true;
  if (!nota.mes_competencia && nota.data_emissao) {
    return mesCompetenciaFromLancamentoData(nota.data_emissao) === mesCompetencia;
  }
  return false;
}

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

export function resolveMesCompetenciaNf(params: {
  mes_competencia_nf?: string;
}): string | undefined {
  const mes = params.mes_competencia_nf?.trim();
  return mes && /^\d{4}-\d{2}$/.test(mes) ? mes : undefined;
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
  T extends {
    nota_id?: unknown;
    data?: Date | string;
    descricao?: string;
    tipo_transacao?: string;
  },
>(lancamentos: T[], mesCompetencia: string | undefined, notaById: Map<string, NotaResumo>): T[] {
  if (!mesCompetencia) return lancamentos;

  const notaIdsDaCompetencia = new Set(
    [...notaById.entries()]
      .filter(([, nota]) => notaMatchesMesCompetencia(nota, mesCompetencia))
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

  const cobrancasSemVinculo = lancamentos.filter((lancamento) => {
    if (lancamento.nota_id) return false;
    if (!isCobrancaRecebidaLancamento(lancamento)) return false;
    return mesCompetenciaFromLancamentoData(lancamento.data) === mesCompetencia;
  });

  return [...principais, ...taxasRelacionadas, ...cobrancasSemVinculo];
}

type LancamentoComOrigem = {
  origem?: string;
  nota_id?: unknown;
  data?: Date | string;
  descricao?: string;
  importacao_id?: unknown;
  json_original?: Record<string, unknown>;
};

export type NubankLancamentoOrigem = 'conta' | 'cartao';

/** Detecta CSV de cartão Nubank (date/title/amount) vs conta (Data/Identificador/Descrição). */
export function detectNubankOrigemFromMapping(mapping: {
  columns: {
    data?: string | null;
    valor?: string | null;
    descricao?: string | null;
    transacao_id?: string | null;
  };
}): NubankLancamentoOrigem {
  const dataCol = mapping.columns.data?.trim().toLowerCase() ?? '';
  const valorCol = mapping.columns.valor?.trim().toLowerCase() ?? '';
  const descCol = mapping.columns.descricao?.trim().toLowerCase() ?? '';
  const txCol = mapping.columns.transacao_id?.trim().toLowerCase() ?? '';

  if (descCol === 'title' || valorCol === 'amount' || (dataCol === 'date' && valorCol === 'amount')) {
    return 'cartao';
  }
  if (txCol === 'identificador' || descCol.includes('descri')) {
    return 'conta';
  }
  return 'conta';
}

export function inferNubankOrigemFromJsonOriginal(
  json?: Record<string, unknown>,
): NubankLancamentoOrigem | undefined {
  if (!json) return undefined;
  const keys = Object.keys(json).map((key) => key.toLowerCase());
  if (keys.includes('title') && keys.includes('amount')) return 'cartao';
  if (keys.includes('identificador') || keys.some((key) => key.includes('descri'))) return 'conta';
  return undefined;
}

export function annotateLancamentosOrigem<
  T extends LancamentoComOrigem,
>(params: {
  lancamentos: T[];
  profileSystemKey?: string;
  profileMapping?: {
    columns: {
      data?: string | null;
      valor?: string | null;
      descricao?: string | null;
      transacao_id?: string | null;
    };
  };
  importOrigemById?: Map<string, NubankLancamentoOrigem>;
  defaultOrigem?: NubankLancamentoOrigem;
}): Array<T & { origem: NubankLancamentoOrigem }> {
  const mappingDefault = params.profileMapping
    ? detectNubankOrigemFromMapping(params.profileMapping)
    : params.profileSystemKey === 'nubank'
      ? 'conta'
      : params.defaultOrigem ?? 'conta';

  return params.lancamentos.map((lancamento) => {
    const fromDb = lancamento.origem === 'cartao' ? 'cartao' : undefined;
    const fromImport = lancamento.importacao_id
      ? params.importOrigemById?.get(String(lancamento.importacao_id))
      : undefined;
    const fromJson = inferNubankOrigemFromJsonOriginal(lancamento.json_original);
    return {
      ...lancamento,
      origem: fromDb ?? fromImport ?? fromJson ?? mappingDefault,
    };
  });
}

/** Extrai AAAA-MM do nome do arquivo de extrato/fatura (ex.: Nubank_2026-06-02.csv). */
export function resolveStatementMonthFromFileName(fileName: string): string | undefined {
  const match = fileName.match(/(\d{4})-(\d{2})/);
  if (!match) return undefined;
  return `${match[1]}-${match[2]}`;
}

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
  resolveCategoria?: (
    tipo: 'Entrada' | 'Saída',
    historico: string,
    lancamento: LancamentoFluxo,
  ) => string,
): { rows: FluxoCaixaRow[]; categorias: string[] } {
  const categorias = new Set<string>(FLUXO_CAIXA_CATEGORIAS);
  const rows: FluxoCaixaRow[] = [];

  for (const lancamento of lancamentos) {
    if (!lancamento.data) continue;
    const nota = lancamento.nota_id ? notaById.get(String(lancamento.nota_id)) : undefined;
    const tipoMovimento =
      getTipoMovimento?.(lancamento) ||
      resolveLancamentoTipoMovimento({
        valor: lancamento.valor,
        descricao: lancamento.descricao,
        tipo_movimento: lancamento.tipo_movimento,
        tipo_transacao: lancamento.tipo_transacao,
        tipo_lancamento: lancamento.tipo_lancamento,
      });
    const tipo = fluxoCaixaTipoFromMovimento(tipoMovimento);
    const historico = getHistorico(lancamento);
    const rawCategoria =
      nota?.codigo_servico || getCategoriaExtra?.(lancamento) || lancamento.categoria;
    const categoria = resolveCategoria
      ? resolveCategoria(tipo, historico, lancamento)
      : resolveFluxoCaixaCategoria(tipo, rawCategoria, historico);
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
