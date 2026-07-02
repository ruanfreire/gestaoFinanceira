import type { FaturaPreview, JsonFilePreview, JsonInconsistency } from "./types";

function asArray<T>(value: T | T[] | null | undefined): T[] {
  if (value == null) return [];
  return Array.isArray(value) ? value : [value];
}

function mapItem(empresa: Record<string, unknown>, item: Record<string, unknown>): FaturaPreview {
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
          previews.push(mapItem(empresaRecord, item));
        }
      }
    }
  }
  return previews;
}

export function detectJsonInconsistencies(faturas: FaturaPreview[]): JsonInconsistency[] {
  const issues: JsonInconsistency[] = [];
  const numeroCounts = new Map<string, number>();

  faturas.forEach((fatura, index) => {
    const ref = fatura.numero ?? `item ${index + 1}`;

    if (!fatura.numero?.trim()) {
      issues.push({ type: "missing_numero", message: `Nota sem número (posição ${index + 1})` });
    }
    if (fatura.valor == null || Number.isNaN(fatura.valor)) {
      issues.push({ type: "missing_valor", message: `NF ${ref}: valor ausente ou inválido` });
    }
    if (!fatura.tomador?.trim()) {
      issues.push({ type: "missing_tomador", message: `NF ${ref}: tomador ausente` });
    }
    const status = fatura.status_emissao?.toUpperCase() ?? "";
    if (status.includes("CANCEL")) {
      issues.push({ type: "cancelada", message: `NF ${ref}: consta como cancelada no arquivo` });
    }
    if (fatura.numero?.trim()) {
      const key = fatura.numero.trim();
      numeroCounts.set(key, (numeroCounts.get(key) ?? 0) + 1);
    }
  });

  for (const [numero, count] of numeroCounts) {
    if (count > 1) {
      issues.push({ type: "duplicate_numero", message: `NF ${numero}: aparece ${count} vezes no arquivo` });
    }
  }

  return issues;
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
    const inconsistencies = detectJsonInconsistencies(faturas);
    return {
      valid: faturas.length > 0,
      totalFaturas: faturas.length,
      empresas,
      sample: faturas.slice(0, 5),
      inconsistencies,
    };
  } catch {
    return {
      valid: false,
      error: "Arquivo JSON inválido ou estrutura não reconhecida.",
      totalFaturas: 0,
      empresas: 0,
      sample: [],
      inconsistencies: [],
    };
  }
}

function parseCsvLine(line: string): string[] {
  const cells: string[] = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    if (char === '"') {
      inQuotes = !inQuotes;
      continue;
    }
    if (char === "," && !inQuotes) {
      cells.push(current.trim());
      current = "";
      continue;
    }
    current += char;
  }
  cells.push(current.trim());
  return cells;
}

export async function parseCsvFilePreview(file: File) {
  try {
    const text = await file.text();
    const lines = text.split(/\r?\n/).filter((l) => l.trim());
    if (lines.length === 0) {
      return { valid: false, error: "Arquivo CSV vazio.", lineCount: 0, headers: [], sampleRows: [] };
    }
    return {
      valid: true,
      lineCount: Math.max(0, lines.length - 1),
      headers: parseCsvLine(lines[0]),
      sampleRows: lines.slice(1, 4).map(parseCsvLine),
    };
  } catch {
    return { valid: false, error: "Não foi possível ler o CSV.", lineCount: 0, headers: [], sampleRows: [] };
  }
}
