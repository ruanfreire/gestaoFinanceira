import { extractNotaItemsFromJson } from '../../importacoes/nf-json.mapper';
import type { NfImportAnalysisResult, NfImportProfileMapping } from '../types/nf-import-profile.types';
import { HONEST_V1_NF_MAPPING } from '../types/nf-import-profile.types';
import { extractNfPairsFromJson, parseNfJsonWithMapping } from './nf-json-profile.mapper';

const DEFAULT_CUSTOM_FIELDS: NfImportProfileMapping['item_fields'] = {
  numero: 'numero',
  nota_api_id: 'id|nota_api_id',
  tomador: 'tomador_nome|tomador|razao_social',
  tomador_documento: 'tomador_documento|tomador_cnpj|tomador_cpf|cpf_cnpj',
  tomador_email: 'tomador_email|email_tomador',
  codigo_servico: 'codigo_servico|codigoServico',
  discriminacao: 'discriminacao|descricao_servico|servico_descricao',
  valor: 'valor|valor_total|valorTotal',
  valor_liquido: 'valor_liquido|valorLiquido',
  data_emissao: 'data_emissao|dataEmissao',
  data_competencia: 'data_competencia|competencia|mes_referencia',
  status_emissao: 'status_emissao|statusEmissao|status',
  rps_id: 'rps_id|rpsId',
  link_prefeitura: 'link_prefeitura|linkPrefeitura',
};

const DEFAULT_EMPRESA_FIELDS: NfImportProfileMapping['empresa_fields'] = {
  id: 'id',
  nome: 'nome|razao_social|name',
  cnpj: 'cnpj|documento',
  codigo: 'codigo|code',
};

function scoreObjectAsNota(obj: Record<string, unknown>): number {
  let score = 0;
  const keys = Object.keys(obj).map((k) => k.toLowerCase());
  if (keys.some((k) => k.includes('numero') || k === 'nf')) score += 0.25;
  if (keys.some((k) => k.includes('valor'))) score += 0.25;
  if (keys.some((k) => k.includes('tomador') || k.includes('cliente'))) score += 0.2;
  if (keys.some((k) => k.includes('emissao') || k.includes('competencia'))) score += 0.15;
  if (keys.some((k) => k.includes('status'))) score += 0.15;
  return score;
}

function findBestTraversal(root: unknown): NfImportProfileMapping['traversal'] | null {
  if (!root || typeof root !== 'object') return null;

  const candidates: Array<{ traversal: NfImportProfileMapping['traversal']; score: number }> = [];

  const tryTraversal = (traversal: NfImportProfileMapping['traversal']) => {
    const mapping: NfImportProfileMapping = {
      structure: 'custom',
      traversal,
      item_fields: DEFAULT_CUSTOM_FIELDS,
      empresa_fields: DEFAULT_EMPRESA_FIELDS,
    };
    const pairs = extractNfPairsFromJson(root, mapping);
    if (pairs.length === 0) return;
    const avg =
      pairs.slice(0, 5).reduce((sum, p) => sum + scoreObjectAsNota(p.item), 0) /
      Math.min(pairs.length, 5);
    candidates.push({ traversal, score: pairs.length * 0.3 + avg });
  };

  tryTraversal({ data_array: 'data', empresa_array: 'empresa', lista_array: 'nf_lista', items_array: 'items' });
  tryTraversal({ empresa_array: 'empresas', lista_array: 'notas', items_array: 'items' });
  tryTraversal({ data_array: 'data', items_array: 'notas' });
  tryTraversal({ items_array: 'notas' });
  tryTraversal({ items_array: 'invoices' });
  tryTraversal({ data_array: 'data', empresa_array: 'empresa', items_array: 'items' });

  candidates.sort((a, b) => b.score - a.score);
  return candidates[0]?.traversal ?? null;
}

export function analyzeNfJsonHeuristic(content: string, fileName: string): NfImportAnalysisResult {
  let parsed: unknown;
  try {
    parsed = JSON.parse(content);
  } catch {
    return {
      profile_name_suggested: fileName.replace(/\.json$/i, ''),
      mapping: HONEST_V1_NF_MAPPING,
      field_confidence: {},
      overall_confidence: 0,
      gaps: [{ field: 'json', severity: 'error', message: 'Arquivo JSON inválido.' }],
      source: 'heuristic',
      sample: [],
      total_notas: 0,
      parse_errors: ['JSON inválido'],
    };
  }

  const honestPairs = extractNotaItemsFromJson(parsed);
  if (honestPairs.length > 0) {
    const { previews, errors } = parseNfJsonWithMapping(parsed, HONEST_V1_NF_MAPPING);
    return {
      profile_name_suggested: 'Formato Honest / padrão',
      mapping: HONEST_V1_NF_MAPPING,
      field_confidence: { numero: 1, valor: 1, tomador: 1 },
      overall_confidence: 0.98,
      gaps: [
        {
          field: 'structure',
          severity: 'info',
          message: `Formato padrão detectado (${honestPairs.length} nota(s)). Compatível com Honest e exportações similares.`,
        },
      ],
      source: 'heuristic',
      sample: previews.slice(0, 5),
      total_notas: previews.length,
      parse_errors: errors.slice(0, 10),
    };
  }

  const traversal = findBestTraversal(parsed);
  if (!traversal) {
    return {
      profile_name_suggested: fileName.replace(/\.json$/i, ''),
      mapping: {
        structure: 'custom',
        traversal: {},
        item_fields: DEFAULT_CUSTOM_FIELDS,
        empresa_fields: DEFAULT_EMPRESA_FIELDS,
      },
      field_confidence: {},
      overall_confidence: 0.2,
      gaps: [
        {
          field: 'structure',
          severity: 'warning',
          message: 'Estrutura não reconhecida automaticamente — a IA tentará sugerir o mapeamento.',
        },
      ],
      source: 'heuristic',
      sample: [],
      total_notas: 0,
      parse_errors: [],
    };
  }

  const mapping: NfImportProfileMapping = {
    structure: 'custom',
    traversal,
    item_fields: DEFAULT_CUSTOM_FIELDS,
    empresa_fields: DEFAULT_EMPRESA_FIELDS,
    skip_status_patterns: ['CANCEL'],
  };
  const { previews, errors } = parseNfJsonWithMapping(parsed, mapping);
  const conf = previews.length > 0 ? 0.65 : 0.35;

  return {
    profile_name_suggested: fileName.replace(/\.json$/i, ''),
    mapping,
    field_confidence: { numero: conf, valor: conf, tomador: conf - 0.1 },
    overall_confidence: conf,
    gaps: errors.length
      ? [{ field: 'parse', severity: 'warning', message: `${errors.length} aviso(s) na leitura inicial.` }]
      : [],
    source: 'heuristic',
    sample: previews.slice(0, 5),
    total_notas: previews.length,
    parse_errors: errors.slice(0, 10),
  };
}

export function sanitizeNfStructureSample(json: unknown, maxDepth = 4): string {
  const walk = (value: unknown, depth: number): unknown => {
    if (depth > maxDepth) return '…';
    if (Array.isArray(value)) {
      return [walk(value[0], depth + 1), `…+${Math.max(0, value.length - 1)}`];
    }
    if (value && typeof value === 'object') {
      const out: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(value as Record<string, unknown>).slice(0, 12)) {
        out[k] = walk(v, depth + 1);
      }
      return out;
    }
    if (typeof value === 'string' && value.length > 40) return `${value.slice(0, 20)}…`;
    return value;
  };
  return JSON.stringify(walk(json, 0), null, 0);
}
