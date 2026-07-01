import { mesCompetenciaFromDate } from '../notas/competencia.util';
import { parsePrefeituraLink } from './prefeitura-link.util';

function asArray<T>(value: T | T[] | null | undefined): T[] {
  if (value == null) return [];
  return Array.isArray(value) ? value : [value];
}

export function extractNotaItemsFromJson(json: unknown): Array<{ empresa: Record<string, unknown>; item: Record<string, unknown> }> {
  const pairs: Array<{ empresa: Record<string, unknown>; item: Record<string, unknown> }> = [];
  const root = json as Record<string, unknown> | null | undefined;

  for (const dataItem of asArray(root?.data as unknown)) {
    const dataRecord = dataItem as Record<string, unknown>;
    for (const empresa of asArray(dataRecord?.empresa as unknown)) {
      const empresaRecord = empresa as Record<string, unknown>;
      for (const nfLista of asArray(empresaRecord?.nf_lista as unknown)) {
        const listaRecord = nfLista as Record<string, unknown>;
        for (const item of (listaRecord?.items as Record<string, unknown>[]) || []) {
          pairs.push({ empresa: empresaRecord, item });
        }
      }
    }
  }

  return pairs;
}

export type FaturaPreview = {
  nota_api_id?: string;
  numero?: string;
  tomador?: string;
  codigo_servico?: string;
  valor?: number;
  data_emissao?: string;
  mes_competencia?: string;
  status_emissao?: string;
  empresa_nome?: string;
  empresa_id?: number;
};

export function mapNfItemToPreview(
  empresa: Record<string, unknown>,
  item: Record<string, unknown>,
): FaturaPreview {
  const dto = mapNfItemToNotaDto(empresa, item);
  return {
    nota_api_id: dto.nota_api_id,
    numero: dto.numero,
    tomador: dto.tomador,
    codigo_servico: dto.codigo_servico,
    valor: dto.valor,
    data_emissao: dto.data_emissao?.toISOString?.()?.slice(0, 10),
    mes_competencia: dto.mes_competencia,
    status_emissao: dto.status_emissao,
    empresa_nome: dto.empresa_nome,
    empresa_id: dto.empresa_id,
  };
}

const NF_KNOWN_KEYS = new Set([
  'id',
  'nota_api_id',
  'numero',
  'tomador',
  'tomador_nome',
  'codigo_servico',
  'valor',
  'valor_liquido',
  'valorLiquido',
  'iss',
  'iss_valor',
  'valor_iss',
  'aliquota',
  'aliquota_iss',
  'data_emissao',
  'dataEmissao',
  'data_competencia',
  'competencia',
  'mes_referencia',
  'status',
  'status_emissao',
  'statusEmissao',
  'rps_id',
  'rpsId',
  'link_prefeitura',
  'linkPrefeitura',
  'tomador_cpf',
  'tomador_cnpj',
  'cpf_cnpj',
  'documento_tomador',
  'tomador_documento',
  'email_tomador',
  'tomador_email',
  'discriminacao',
  'descricao_servico',
  'servico_descricao',
  '__typename',
]);

function firstString(item: Record<string, unknown>, ...keys: string[]): string | undefined {
  for (const key of keys) {
    const value = item[key];
    if (value == null || value === '') continue;
    return String(value).trim();
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

function pickEmpresaSnapshot(empresa: Record<string, unknown>) {
  return {
    id: empresa.id != null ? Number(empresa.id) : undefined,
    nome: firstString(empresa, 'nome', 'razao_social', 'name'),
    codigo: firstString(empresa, 'codigo', 'code'),
    cnpj: firstString(empresa, 'cnpj', 'documento'),
  };
}

function extractFaturaExtras(item: Record<string, unknown>) {
  const extras: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(item)) {
    if (NF_KNOWN_KEYS.has(key)) continue;
    if (value == null || value === '') continue;
    extras[key] = value;
  }
  return Object.keys(extras).length > 0 ? extras : undefined;
}

export type FaturaSnapshot = {
  nf: Record<string, unknown>;
  empresa: ReturnType<typeof pickEmpresaSnapshot>;
  mapeado_em: string;
};

export function buildFaturaSnapshot(
  empresa: Record<string, unknown>,
  item: Record<string, unknown>,
): FaturaSnapshot {
  return {
    nf: item,
    empresa: pickEmpresaSnapshot(empresa),
    mapeado_em: new Date().toISOString(),
  };
}

export function mapNfItemToNotaDto(empresa: Record<string, unknown>, item: Record<string, unknown>) {
  const linkPrefeitura = firstString(item, 'link_prefeitura', 'linkPrefeitura');
  const prefeitura = parsePrefeituraLink(linkPrefeitura);
  const empresaId = empresa.id != null ? Number(empresa.id) : undefined;
  const empresaSnapshot = pickEmpresaSnapshot(empresa);

  const dataEmissao = parseDateValue(firstString(item, 'data_emissao', 'dataEmissao'));
  const dataCompetencia = parseDateValue(
    firstString(item, 'data_competencia', 'competencia', 'mes_referencia'),
  );

  const tomadorDocumento =
    firstString(item, 'tomador_documento', 'documento_tomador', 'cpf_cnpj') ||
    firstString(item, 'tomador_cnpj') ||
    firstString(item, 'tomador_cpf');

  const mesCompetencia =
    mesCompetenciaFromDate(dataCompetencia) || mesCompetenciaFromDate(dataEmissao);

  const snapshot = buildFaturaSnapshot(empresa, item);

  return {
    empresa:
      empresaSnapshot.nome ||
      (empresaId != null ? String(empresaId) : undefined) ||
      firstString(empresa, 'codigo'),
    empresa_id: Number.isFinite(empresaId) ? empresaId : undefined,
    empresa_nome: empresaSnapshot.nome,
    empresa_cnpj: empresaSnapshot.cnpj,
    numero: firstString(item, 'numero'),
    nota_api_id: firstString(item, 'nota_api_id', 'id'),
    tomador: firstString(item, 'tomador', 'tomador_nome', 'razao_social', 'nome_tomador'),
    tomador_documento: tomadorDocumento,
    tomador_email: firstString(item, 'tomador_email', 'email_tomador'),
    codigo_servico: firstString(item, 'codigo_servico', 'codigoServico'),
    discriminacao: firstString(item, 'discriminacao', 'descricao_servico', 'servico_descricao'),
    valor: parseNumber(item.valor ?? item.valor_total ?? item.valorTotal),
    valor_liquido: parseNumber(item.valor_liquido ?? item.valorLiquido),
    valor_iss: parseNumber(item.valor_iss ?? item.iss_valor ?? item.iss),
    aliquota_iss: parseNumber(item.aliquota_iss ?? item.aliquota),
    data_emissao: dataEmissao,
    data_competencia: dataCompetencia,
    mes_competencia: mesCompetencia,
    status: firstString(item, 'status', 'status_emissao', 'statusEmissao'),
    status_emissao: firstString(item, 'status_emissao', 'statusEmissao', 'status'),
    rps_id: firstString(item, 'rps_id', 'rpsId'),
    link_prefeitura: linkPrefeitura,
    ...prefeitura,
    fatura_extras: extractFaturaExtras(item),
    json_original: snapshot,
  };
}

/** Reaplica o mapeamento a partir do snapshot ou payload legado (item puro). */
export function mapFromStoredJsonOriginal(jsonOriginal: unknown) {
  if (!jsonOriginal || typeof jsonOriginal !== 'object') return null;
  const record = jsonOriginal as Record<string, unknown>;
  const nf = (record.nf ?? record) as Record<string, unknown>;
  const empresa = (record.empresa ?? {}) as Record<string, unknown>;
  return mapNfItemToNotaDto(empresa, nf);
}
