import { ConfigService } from '@nestjs/config';

export type FluxoCaixaExportBanco = 'consolidado' | 'custom';

export type FluxoCaixaQueryOverrides = {
  empresa_nome?: string;
  empresa_cnpj?: string;
  conta_corrente?: string;
  saldo_inicial?: string;
  banco_label?: string;
};

function parseSaldoInicial(
  config: ConfigService,
  overrides: FluxoCaixaQueryOverrides,
  autoSaldoInicial?: number | null,
): number {
  if (overrides.saldo_inicial?.trim()) {
    const parsed = Number.parseFloat(String(overrides.saldo_inicial).replace(',', '.'));
    return Number.isFinite(parsed) ? parsed : 0;
  }
  if (autoSaldoInicial != null && Number.isFinite(autoSaldoInicial)) {
    return autoSaldoInicial;
  }
  const saldoRaw = config.get<string>('FLUXO_CAIXA_SALDO_INICIAL') ?? '0';
  return Number.parseFloat(String(saldoRaw).replace(',', '.')) || 0;
}

export function resolveFluxoCaixaHeader(
  config: ConfigService,
  overrides: FluxoCaixaQueryOverrides = {},
  autoSaldoInicial?: number | null,
) {
  return {
    empresaNome:
      overrides.empresa_nome?.trim() || config.get<string>('FLUXO_CAIXA_EMPRESA_NOME') || '',
    empresaCnpj:
      overrides.empresa_cnpj?.trim() || config.get<string>('FLUXO_CAIXA_EMPRESA_CNPJ') || '',
    banco: overrides.banco_label?.trim() || config.get<string>('FLUXO_CAIXA_BANCO') || '',
    contaCorrente: overrides.conta_corrente?.trim() || config.get<string>('FLUXO_CAIXA_CONTA') || '',
    saldoInicial: parseSaldoInicial(config, overrides, autoSaldoInicial),
  };
}

export type FluxoCaixaExportParams = FluxoCaixaQueryOverrides & {
  from?: string;
  to?: string;
  mes_pagamento?: string;
  /** @deprecated use mes_pagamento — interpretado como mês da data de pagamento */
  mes_competencia?: string;
  /** Mês de competência da NF (AAAA-MM) — filtra lançamentos vinculados às notas do mês */
  mes_competencia_nf?: string;
};

/** Exige mês de pagamento (AAAA-MM) ou intervalo completo (from + to). */
export function validateFluxoCaixaExportParams(params: FluxoCaixaExportParams): string | null {
  const mes = params.mes_pagamento?.trim() || params.mes_competencia?.trim();
  const { from, to } = params;

  if (mes) {
    if (!/^\d{4}-\d{2}$/.test(mes)) {
      return 'Mês de pagamento inválido. Use o formato AAAA-MM.';
    }
    return null;
  }

  if (from || to) {
    if (!from?.trim() || !to?.trim()) {
      return 'Informe as datas inicial e final do período de pagamento.';
    }
    if (from > to) {
      return 'A data inicial não pode ser posterior à data final.';
    }
    const fromDate = new Date(`${from}T00:00:00.000Z`);
    const toDate = new Date(`${to}T00:00:00.000Z`);
    const days = (toDate.getTime() - fromDate.getTime()) / (24 * 60 * 60 * 1000) + 1;
    if (!Number.isFinite(days) || days > 93) {
      return 'O intervalo do relatório deve ter no máximo 93 dias. Use o filtro por mês para melhor desempenho.';
    }
    return null;
  }

  return 'Informe o mês de pagamento ou um intervalo de datas para gerar o relatório.';
}

function exportPeriodLabel(params: FluxoCaixaExportParams): string {
  return (
    params.mes_pagamento ||
    params.mes_competencia ||
    (params.from && params.to ? `${params.from}-a-${params.to}` : 'completo')
  );
}

export function buildFluxoCaixaFilename(bankSlug: string, params: FluxoCaixaExportParams) {
  const stamp = new Date().toISOString().slice(0, 10);
  const slug = bankSlug.toLowerCase().replace(/[^a-z0-9]+/gi, '-').slice(0, 24) || 'banco';
  return `fluxo-caixa-${slug}-${exportPeriodLabel(params)}-${stamp}.xlsx`;
}

export function buildFluxoCaixaConsolidadoFilename(params: FluxoCaixaExportParams) {
  const stamp = new Date().toISOString().slice(0, 10);
  return `fluxo-caixa-consolidado-${exportPeriodLabel(params)}-${stamp}.xlsx`;
}
