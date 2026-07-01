import type { FaturaPreview, JsonFilePreview } from "../types/importacao-fatura.types";

function asArray<T>(value: T | T[] | null | undefined): T[] {
  if (value == null) return [];
  return Array.isArray(value) ? value : [value];
}

function mapItemToPreview(
  empresa: Record<string, unknown>,
  item: Record<string, unknown>,
): FaturaPreview {
  const dataEmissao = item.data_emissao;
  return {
    nota_api_id: item.id != null ? String(item.id) : undefined,
    numero: item.numero != null ? String(item.numero) : undefined,
    tomador: (item.tomador_nome ?? item.tomador) as string | undefined,
    codigo_servico: item.codigo_servico as string | undefined,
    valor: item.valor != null ? Number.parseFloat(String(item.valor)) : undefined,
    data_emissao: dataEmissao != null ? String(dataEmissao).slice(0, 10) : undefined,
    status_emissao: item.status_emissao as string | undefined,
    empresa_nome: (empresa.nome ?? empresa.razao_social ?? empresa.id) as string | undefined,
  };
}

export function extractFaturasFromJson(json: unknown): FaturaPreview[] {
  const root = json as Record<string, unknown> | null | undefined;
  const previews: FaturaPreview[] = [];

  for (const dataItem of asArray(root?.data as unknown)) {
    const dataRecord = dataItem as Record<string, unknown>;
    for (const empresa of asArray(dataRecord?.empresa as unknown)) {
      const empresaRecord = empresa as Record<string, unknown>;
      for (const nfLista of asArray(empresaRecord?.nf_lista as unknown)) {
        const listaRecord = nfLista as Record<string, unknown>;
        for (const item of (listaRecord?.items as Record<string, unknown>[]) || []) {
          previews.push(mapItemToPreview(empresaRecord, item));
        }
      }
    }
  }

  return previews;
}

export async function parseJsonFilePreview(file: File): Promise<JsonFilePreview> {
  try {
    const text = await file.text();
    const json = JSON.parse(text) as unknown;
    const faturas = extractFaturasFromJson(json);

    const root = json as Record<string, unknown>;
    let empresas = 0;
    for (const dataItem of asArray(root?.data as unknown)) {
      empresas += asArray((dataItem as Record<string, unknown>)?.empresa as unknown).length;
    }

    return {
      valid: true,
      totalFaturas: faturas.length,
      empresas,
      sample: faturas.slice(0, 5),
    };
  } catch {
    return {
      valid: false,
      error: "Arquivo JSON inválido ou estrutura não reconhecida.",
      totalFaturas: 0,
      empresas: 0,
      sample: [],
    };
  }
}
