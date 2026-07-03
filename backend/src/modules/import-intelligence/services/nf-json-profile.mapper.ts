import { mesCompetenciaFromDate } from '../../notas/competencia.util';
import {
  extractNotaItemsFromJson,
  mapNfItemToNotaDto,
  mapNfItemToPreview,
  type FaturaPreview,
} from '../../importacoes/nf-json.mapper';
import { parsePrefeituraLink } from '../../importacoes/prefeitura-link.util';
import type {
  NfImportPreviewItem,
  NfImportProfileMapping,
  NfItemFieldMap,
} from '../types/nf-import-profile.types';
import { HONEST_V1_NF_MAPPING } from '../types/nf-import-profile.types';

function asArray<T>(value: T | T[] | null | undefined): T[] {
  if (value == null) return [];
  return Array.isArray(value) ? value : [value];
}

function collectAtKey(objects: unknown[], key?: string): unknown[] {
  if (!key?.trim()) return objects;
  const out: unknown[] = [];
  for (const obj of objects) {
    if (!obj || typeof obj !== 'object') continue;
    const val = (obj as Record<string, unknown>)[key];
    if (val == null) continue;
    if (Array.isArray(val)) out.push(...val);
    else out.push(val);
  }
  return out;
}

function resolveDotPath(obj: unknown, path: string): unknown {
  let cur: unknown = obj;
  for (const part of path.split('.')) {
    if (cur == null || typeof cur !== 'object') return undefined;
    cur = (cur as Record<string, unknown>)[part];
  }
  return cur;
}

function readMappedField(obj: Record<string, unknown>, path?: string): unknown {
  if (!path?.trim()) return undefined;
  for (const alt of path.split('|').map((s) => s.trim())) {
    const val = resolveDotPath(obj, alt);
    if (val != null && val !== '') return val;
  }
  return undefined;
}

function parseNumber(value: unknown): number | undefined {
  if (value == null || value === '') return undefined;
  const parsed = Number.parseFloat(String(value).replace(',', '.'));
  return Number.isFinite(parsed) ? parsed : undefined;
}

function parseDateValue(value: unknown): Date | undefined {
  if (value == null || value === '') return undefined;
  const parsed = new Date(String(value));
  return Number.isNaN(parsed.getTime()) ? undefined : parsed;
}

function firstStringFromMap(item: Record<string, unknown>, fields: NfItemFieldMap, key: keyof NfItemFieldMap) {
  const raw = readMappedField(item, fields[key]);
  if (raw == null || raw === '') return undefined;
  return String(raw).trim();
}

export function extractNfPairsFromJson(
  json: unknown,
  mapping: NfImportProfileMapping = HONEST_V1_NF_MAPPING,
): Array<{ empresa: Record<string, unknown>; item: Record<string, unknown> }> {
  if (mapping.structure === 'honest_v1') {
    return extractNotaItemsFromJson(json);
  }

  const t = mapping.traversal;
  let nodes: unknown[] = [json];
  if (t.data_array) nodes = collectAtKey(nodes, t.data_array);
  let empresas = nodes;
  if (t.empresa_array) empresas = collectAtKey(empresas, t.empresa_array);

  const pairs: Array<{ empresa: Record<string, unknown>; item: Record<string, unknown> }> = [];

  for (const empresaNode of empresas) {
    if (!empresaNode || typeof empresaNode !== 'object') continue;
    const empresa = empresaNode as Record<string, unknown>;

    let itemParents: unknown[] = [empresa];
    if (t.lista_array) itemParents = collectAtKey(itemParents, t.lista_array);

    for (const parent of itemParents) {
      if (!parent || typeof parent !== 'object') continue;
      const items = t.items_array
        ? collectAtKey([parent], t.items_array)
        : [parent];
      for (const item of items) {
        if (item && typeof item === 'object') {
          pairs.push({ empresa, item: item as Record<string, unknown> });
        }
      }
    }
  }

  return pairs;
}

function mapCustomItemToNotaDto(
  empresa: Record<string, unknown>,
  item: Record<string, unknown>,
  mapping: NfImportProfileMapping,
) {
  const ef = mapping.empresa_fields;
  const f = mapping.item_fields;

  const empresaIdRaw = readMappedField(empresa, ef.id);
  const empresaId = empresaIdRaw != null ? Number(empresaIdRaw) : undefined;

  const dataEmissao = parseDateValue(firstStringFromMap(item, f, 'data_emissao'));
  const dataCompetencia = parseDateValue(firstStringFromMap(item, f, 'data_competencia'));
  const linkPrefeitura = firstStringFromMap(item, f, 'link_prefeitura');
  const prefeitura = parsePrefeituraLink(linkPrefeitura);

  const tomadorDocumento = firstStringFromMap(item, f, 'tomador_documento');

  const mesCompetencia =
    mesCompetenciaFromDate(dataCompetencia) || mesCompetenciaFromDate(dataEmissao);

  const empresaNome =
    (readMappedField(empresa, ef.nome) != null ? String(readMappedField(empresa, ef.nome)).trim() : undefined) ||
    (readMappedField(empresa, ef.codigo) != null ? String(readMappedField(empresa, ef.codigo)).trim() : undefined);

  return {
    empresa: empresaNome || (Number.isFinite(empresaId) ? String(empresaId) : undefined),
    empresa_id: Number.isFinite(empresaId) ? empresaId : undefined,
    empresa_nome: empresaNome,
    empresa_cnpj:
      readMappedField(empresa, ef.cnpj) != null ? String(readMappedField(empresa, ef.cnpj)).trim() : undefined,
    numero: firstStringFromMap(item, f, 'numero'),
    nota_api_id: firstStringFromMap(item, f, 'nota_api_id') || firstStringFromMap(item, f, 'numero'),
    tomador: firstStringFromMap(item, f, 'tomador'),
    tomador_documento: tomadorDocumento,
    tomador_email: firstStringFromMap(item, f, 'tomador_email'),
    codigo_servico: firstStringFromMap(item, f, 'codigo_servico'),
    discriminacao: firstStringFromMap(item, f, 'discriminacao'),
    valor: parseNumber(readMappedField(item, f.valor)),
    valor_liquido: parseNumber(readMappedField(item, f.valor_liquido)),
    valor_iss: parseNumber(readMappedField(item, f.valor_iss)),
    aliquota_iss: parseNumber(readMappedField(item, f.aliquota_iss)),
    data_emissao: dataEmissao,
    data_competencia: dataCompetencia,
    mes_competencia: mesCompetencia,
    status: firstStringFromMap(item, f, 'status_emissao'),
    status_emissao: firstStringFromMap(item, f, 'status_emissao'),
    rps_id: firstStringFromMap(item, f, 'rps_id'),
    link_prefeitura: linkPrefeitura,
    ...prefeitura,
    json_original: { nf: item, empresa: { id: empresaId, nome: empresaNome }, mapeado_em: new Date().toISOString() },
  };
}

export function mapNfPairToNotaDto(
  empresa: Record<string, unknown>,
  item: Record<string, unknown>,
  mapping: NfImportProfileMapping,
) {
  if (mapping.structure === 'honest_v1') {
    return mapNfItemToNotaDto(empresa, item);
  }
  return mapCustomItemToNotaDto(empresa, item, mapping);
}

export function mapNfPairToPreview(
  empresa: Record<string, unknown>,
  item: Record<string, unknown>,
  mapping: NfImportProfileMapping,
): NfImportPreviewItem {
  if (mapping.structure === 'honest_v1') {
    const p: FaturaPreview = mapNfItemToPreview(empresa, item);
    return {
      numero: p.numero,
      nota_api_id: p.nota_api_id,
      tomador: p.tomador,
      valor: p.valor,
      data_emissao: p.data_emissao,
      mes_competencia: p.mes_competencia,
      status_emissao: p.status_emissao,
      empresa_nome: p.empresa_nome,
    };
  }
  const dto = mapCustomItemToNotaDto(empresa, item, mapping);
  return {
    numero: dto.numero,
    nota_api_id: dto.nota_api_id,
    tomador: dto.tomador,
    valor: dto.valor,
    data_emissao: dto.data_emissao?.toISOString?.()?.slice(0, 10),
    mes_competencia: dto.mes_competencia,
    status_emissao: dto.status_emissao,
    empresa_nome: dto.empresa_nome,
  };
}

export function shouldSkipNotaStatus(status: string | undefined, patterns: string[] = []) {
  const upper = status?.toUpperCase() ?? '';
  return patterns.some((p) => upper.includes(p.toUpperCase()));
}

export function parseNfJsonWithMapping(
  json: unknown,
  mapping: NfImportProfileMapping,
): { previews: NfImportPreviewItem[]; errors: string[]; pairs: Array<{ empresa: Record<string, unknown>; item: Record<string, unknown> }> } {
  const errors: string[] = [];
  const pairs = extractNfPairsFromJson(json, mapping);
  if (pairs.length === 0) {
    errors.push('Nenhuma nota encontrada com o modelo de importação atual.');
  }
  const previews: NfImportPreviewItem[] = [];
  for (let i = 0; i < pairs.length; i += 1) {
    const { empresa, item } = pairs[i];
    try {
      const preview = mapNfPairToPreview(empresa, item, mapping);
      if (!preview.valor && preview.valor !== 0) {
        errors.push(`Nota ${preview.numero ?? i + 1}: valor ausente ou inválido.`);
      }
      previews.push(preview);
    } catch (e) {
      errors.push(`Item ${i + 1}: ${(e as Error).message}`);
    }
  }
  return { previews, errors, pairs };
}
