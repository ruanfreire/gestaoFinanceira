export const MODULE_KEYS = [
  'finance',
  'fiscal_emissao',
  'integrations_honest',
  'document_core',
  'logistics_frete',
  'fiscal_cte',
  'tms',
  'wms',
  'erp',
  'health_tiss',
] as const;

export type ModuleKey = (typeof MODULE_KEYS)[number];

export type ModuleStatus = 'production' | 'beta' | 'disabled';

export type ModuleDefinition = {
  key: ModuleKey;
  name: string;
  description: string;
  defaultEnabled: boolean;
  status: ModuleStatus;
  requires?: ModuleKey[];
  /** Desligados em cascata quando este módulo é desabilitado. */
  cascades?: ModuleKey[];
};

export const DEFAULT_ENABLED_MODULES: ModuleKey[] = ['finance'];

export const MODULE_CATALOG: ModuleDefinition[] = [
  {
    key: 'finance',
    name: 'Finance',
    description: 'Notas, extrato, recebimentos e fluxo de caixa',
    defaultEnabled: true,
    status: 'production',
  },
  {
    key: 'fiscal_emissao',
    name: 'Emissão NFS-e',
    description: 'Emissão de notas via prefeitura',
    defaultEnabled: false,
    status: 'production',
    requires: ['finance'],
  },
  {
    key: 'integrations_honest',
    name: 'Honest (importação)',
    description: 'Importação automática de notas via Honest',
    defaultEnabled: false,
    status: 'production',
    requires: ['finance'],
  },
  {
    key: 'document_core',
    name: 'Document Core',
    description: 'Ingestão de XML/ZIP, parsers e envelope documental',
    defaultEnabled: false,
    status: 'beta',
    requires: ['finance'],
    cascades: ['logistics_frete', 'tms'],
  },
  {
    key: 'logistics_frete',
    name: 'Transporte · CT-e',
    description: 'CT-e, títulos de frete e conciliação com extrato',
    defaultEnabled: false,
    status: 'beta',
    requires: ['finance', 'document_core'],
  },
  {
    key: 'fiscal_cte',
    name: 'Fiscal CT-e',
    description: 'Emissão de CT-e na SEFAZ',
    defaultEnabled: false,
    status: 'disabled',
    requires: ['finance', 'document_core'],
  },
  {
    key: 'tms',
    name: 'TMS',
    description: 'Romaneio e entregas',
    defaultEnabled: false,
    status: 'disabled',
    requires: ['finance', 'document_core', 'logistics_frete'],
    cascades: [],
  },
  {
    key: 'wms',
    name: 'WMS',
    description: 'Estoque e expedição',
    defaultEnabled: false,
    status: 'disabled',
    requires: ['finance'],
  },
  {
    key: 'erp',
    name: 'ERP Light',
    description: 'Parceiros e contas a pagar estendido',
    defaultEnabled: false,
    status: 'disabled',
    requires: ['finance'],
  },
  {
    key: 'health_tiss',
    name: 'Saúde · TISS',
    description: 'Parser TISS e lotes',
    defaultEnabled: false,
    status: 'disabled',
    requires: ['finance'],
  },
];

const catalogByKey = new Map(MODULE_CATALOG.map((item) => [item.key, item]));

export function isModuleKey(value: string): value is ModuleKey {
  return (MODULE_KEYS as readonly string[]).includes(value);
}

export function getModuleDefinition(key: ModuleKey): ModuleDefinition {
  return catalogByKey.get(key)!;
}

export function normalizeEnabledModules(input: string[]): ModuleKey[] {
  const set = new Set<ModuleKey>();

  for (const raw of input) {
    if (isModuleKey(raw)) set.add(raw);
  }

  if (!set.has('finance')) set.add('finance');

  let changed = true;
  while (changed) {
    changed = false;
    for (const key of [...set]) {
      const def = catalogByKey.get(key);
      for (const required of def?.requires ?? []) {
        if (!set.has(required)) {
          set.add(required);
          changed = true;
        }
      }
    }
  }

  return MODULE_KEYS.filter((key) => set.has(key));
}

export function applyModuleDisable(current: ModuleKey[], disabledKey: ModuleKey): ModuleKey[] {
  const set = new Set(current);
  set.delete(disabledKey);

  const def = catalogByKey.get(disabledKey);
  for (const cascade of def?.cascades ?? []) {
    set.delete(cascade);
  }

  if (disabledKey === 'document_core') {
    set.delete('logistics_frete');
    set.delete('tms');
    set.delete('fiscal_cte');
  }

  return normalizeEnabledModules([...set]);
}

export function toggleModule(current: ModuleKey[], key: ModuleKey, enabled: boolean): ModuleKey[] {
  if (key === 'finance') {
    return ['finance'];
  }

  if (enabled) {
    return normalizeEnabledModules([...current, key]);
  }

  return applyModuleDisable(normalizeEnabledModules(current), key);
}
