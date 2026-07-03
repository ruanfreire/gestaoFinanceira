import type { FluxoCaixaLayout } from '../../common/fluxo-caixa-lista';
import type { ImportProfileMapping } from './types/import-profile.types';

export type ImportPresetKey = 'asaas' | 'nubank';

export type ImportPreset = {
  key: ImportPresetKey;
  name: string;
  banco_label: string;
  description: string;
  mapping: ImportProfileMapping;
  fluxo_layout: FluxoCaixaLayout;
};

const ASAAS_MAPPING: ImportProfileMapping = {
  header_row: 1,
  delimiter: ',',
  columns: {
    data: 'Data',
    valor: 'Valor',
    descricao: 'Descrição',
    tipo_transacao: 'Transação',
    saldo: 'Saldo',
    transacao_id: null,
    pagador_nome: null,
    documento: null,
  },
  date_format: 'DD/MM/YYYY',
  decimal_format: 'br',
  tipo_movimento_rule: {
    type: 'column',
    column: 'Transação',
    entrada_values: [
      'Cobrança recebida',
      'Transferência recebida',
      'Pix recebido',
      'Recebimento',
      'Estorno',
      'Crédito',
    ],
  },
  skip_row_patterns: ['saldo inicial', 'saldo final', 'período a partir', 'periodo a partir'],
};

const NUBANK_MAPPING: ImportProfileMapping = {
  header_row: 1,
  delimiter: ';',
  columns: {
    data: 'Data',
    valor: 'Valor',
    descricao: 'Descrição',
    transacao_id: 'Identificador',
    tipo_transacao: null,
    saldo: null,
    documento: null,
    pagador_nome: null,
  },
  date_format: 'auto',
  decimal_format: 'br',
  tipo_movimento_rule: { type: 'sign' },
  skip_row_patterns: ['saldo inicial', 'saldo final', 'saldo do dia'],
};

export const IMPORT_PRESETS: Record<ImportPresetKey, ImportPreset> = {
  asaas: {
    key: 'asaas',
    name: 'Asaas',
    banco_label: 'Asaas',
    description: 'CSV exportado do portal Asaas',
    mapping: ASAAS_MAPPING,
    fluxo_layout: 'wide',
  },
  nubank: {
    key: 'nubank',
    name: 'Nubank',
    banco_label: 'Nubank',
    description: 'CSV da conta ou cartão Nubank',
    mapping: NUBANK_MAPPING,
    fluxo_layout: 'compact',
  },
};

export function getImportPreset(key: string): ImportPreset | null {
  if (key === 'asaas' || key === 'nubank') return IMPORT_PRESETS[key];
  return null;
}

export function listImportPresets(): ImportPreset[] {
  return Object.values(IMPORT_PRESETS);
}

/** Garante regra Asaas por coluna mesmo em perfis antigos gravados com `sign`. */
export function resolveImportProfileMapping(profile: {
  system_key?: string;
  mapping: ImportProfileMapping;
}): ImportProfileMapping {
  const preset = profile.system_key ? getImportPreset(profile.system_key) : null;
  if (!preset) return profile.mapping;

  return {
    ...profile.mapping,
    delimiter: profile.mapping.delimiter || preset.mapping.delimiter,
    date_format: profile.mapping.date_format || preset.mapping.date_format,
    decimal_format: profile.mapping.decimal_format || preset.mapping.decimal_format,
    columns: { ...preset.mapping.columns, ...profile.mapping.columns },
    tipo_movimento_rule: preset.mapping.tipo_movimento_rule,
    skip_row_patterns: profile.mapping.skip_row_patterns?.length
      ? profile.mapping.skip_row_patterns
      : preset.mapping.skip_row_patterns,
  };
}
