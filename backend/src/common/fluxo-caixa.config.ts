import { ConfigService } from '@nestjs/config';

export type FluxoCaixaBanco = 'nubank' | 'asaas';

export const FLUXO_CAIXA_BANCOS: FluxoCaixaBanco[] = ['nubank', 'asaas'];

export type FluxoCaixaExportBanco = FluxoCaixaBanco | 'consolidado';

export type FluxoCaixaQueryOverrides = {
  empresa_nome?: string;
  empresa_cnpj?: string;
  conta_corrente?: string;
  saldo_inicial?: string;
  banco_label?: string;
};

const NUBANK_DEFAULTS = {
  empresaNome: 'ANA LUISA RICCI BARDI CALADO NECA',
  empresaCnpj: '39.803.761/0001-17',
  banco: 'NUBANK',
  contaCorrente: '',
  envPrefix: 'FLUXO_CAIXA',
};

const ASAAS_DEFAULTS = {
  empresaNome:
    'MOVIMENTO ORGANIZACIONAL E HUMANO // ANA LUISA RICCI BARDI CALADO NECA 00356359913',
  empresaCnpj: '39.803.761/0001-17',
  banco: 'ASAAS Gestão Financeira Instituição de Pagamento S.A.',
  contaCorrente: '5826845 9',
  envPrefix: 'FLUXO_CAIXA_ASAAS',
};

function parseSaldoInicial(
  config: ConfigService,
  banco: FluxoCaixaBanco,
  overrides: FluxoCaixaQueryOverrides,
  autoSaldoInicial?: number | null,
) {
  if (overrides.saldo_inicial?.trim()) {
    const parsed = Number.parseFloat(String(overrides.saldo_inicial).replace(',', '.'));
    return Number.isFinite(parsed) ? parsed : 0;
  }
  if (autoSaldoInicial != null && Number.isFinite(autoSaldoInicial)) {
    return autoSaldoInicial;
  }
  const prefix = banco === 'asaas' ? 'FLUXO_CAIXA_ASAAS' : 'FLUXO_CAIXA';
  const saldoRaw =
    config.get<string>(`${prefix}_SALDO_INICIAL`) ??
    config.get<string>('FLUXO_CAIXA_SALDO_INICIAL') ??
    '0';
  return Number.parseFloat(String(saldoRaw).replace(',', '.')) || 0;
}

export function resolveFluxoCaixaHeader(
  config: ConfigService,
  banco: FluxoCaixaBanco,
  overrides: FluxoCaixaQueryOverrides = {},
  autoSaldoInicial?: number | null,
) {
  const defaults = banco === 'asaas' ? ASAAS_DEFAULTS : NUBANK_DEFAULTS;
  const prefix = defaults.envPrefix;

  return {
    empresaNome:
      overrides.empresa_nome?.trim() ||
      config.get<string>(`${prefix}_EMPRESA_NOME`) ||
      defaults.empresaNome,
    empresaCnpj:
      overrides.empresa_cnpj?.trim() ||
      config.get<string>(`${prefix}_EMPRESA_CNPJ`) ||
      config.get<string>('FLUXO_CAIXA_EMPRESA_CNPJ') ||
      defaults.empresaCnpj,
    banco:
      overrides.banco_label?.trim() ||
      config.get<string>(`${prefix}_BANCO`) ||
      defaults.banco,
    contaCorrente:
      overrides.conta_corrente?.trim() ||
      config.get<string>(`${prefix}_CONTA`) ||
      config.get<string>(banco === 'nubank' ? 'FLUXO_CAIXA_NUBANK_CONTA' : '') ||
      defaults.contaCorrente,
    saldoInicial: parseSaldoInicial(config, banco, overrides, autoSaldoInicial),
  };
}

export type FluxoCaixaExportParams = FluxoCaixaQueryOverrides & {
  from?: string;
  to?: string;
  mes_pagamento?: string;
  /** @deprecated use mes_pagamento — interpretado como mês da data de pagamento */
  mes_competencia?: string;
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
  }

  return null;
}

function exportPeriodLabel(params: FluxoCaixaExportParams): string {
  return (
    params.mes_pagamento ||
    params.mes_competencia ||
    (params.from && params.to ? `${params.from}-a-${params.to}` : 'completo')
  );
}

export function buildFluxoCaixaFilename(banco: FluxoCaixaBanco, params: FluxoCaixaExportParams) {
  const stamp = new Date().toISOString().slice(0, 10);
  return `fluxo-caixa-${banco}-${exportPeriodLabel(params)}-${stamp}.xlsx`;
}

export function buildFluxoCaixaConsolidadoFilename(params: FluxoCaixaExportParams) {
  const stamp = new Date().toISOString().slice(0, 10);
  return `fluxo-caixa-consolidado-${exportPeriodLabel(params)}-${stamp}.xlsx`;
}
