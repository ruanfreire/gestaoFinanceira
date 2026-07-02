import type { CsvFilePreview } from "../types/importacao-extrato.types";
import type { ImportacaoExtrato } from "../types/importacao-extrato.types";

export { formatDateTime } from "@/shared/utils/format-date.util";

export function bancoLabel(banco: string): string {
  if (banco === "asaas") return "Asaas";
  if (banco === "nubank") return "Nubank";
  return banco;
}

export function importacaoExtratoDisplayName(item: {
  label?: string;
  originalName?: string;
  filename?: string;
  _id?: string;
}): string {
  return item.label || item.originalName || item.filename || item._id || "Importação";
}

export function statusConciliacaoLabel(status?: string): string {
  if (status === "extrato") return "Extrato";
  if (status === "conciliado_auto") return "Conciliado auto";
  if (status === "conciliado_manual") return "Conciliado manual";
  if (status === "pendente_vinculo") return "Pendente";
  if (status === "sem_match") return "Sem match";
  if (status === "ignorado") return "Ignorado";
  return status || "—";
}

export function tipoMovimentoLabel(tipo?: string): string {
  if (tipo === "saida") return "Saída";
  if (tipo === "entrada") return "Entrada";
  return "—";
}

export function movimentosLabel(item: ImportacaoExtrato): string {
  const entradas = item.stats?.entradas;
  const saidas = item.stats?.saidas;
  if (entradas != null || saidas != null) {
    return `${entradas ?? 0} / ${saidas ?? 0}`;
  }
  if (item.banco === "asaas") {
    return String(item.stats?.cobrancas ?? item.stats?.imported ?? "—");
  }
  return String(item.stats?.creditos ?? item.stats?.imported ?? "—");
}

export function movimentosCaption(item: ImportacaoExtrato): string {
  if (item.stats?.entradas != null || item.stats?.saidas != null) {
    return "entradas / saídas";
  }
  return item.banco === "asaas" ? "cobranças" : "créditos";
}

export function linhasImportadas(item: ImportacaoExtrato): string {
  const noArquivo = item.stats?.total_linhas;
  const novas = item.stats?.imported;
  if (noArquivo != null) return String(noArquivo);
  if (novas != null) return String(novas);
  return "—";
}

export function novasImportadas(item: ImportacaoExtrato): string {
  const novas = item.stats?.imported;
  if (novas != null) return String(novas);
  return "—";
}

export function conciliadosTotal(item: ImportacaoExtrato): number {
  return (item.stats?.conciliado_auto ?? 0) + (item.stats?.conciliado_manual ?? 0);
}

export function paginationRange(page: number, limit: number, total: number) {
  if (total === 0) return { from: 0, to: 0 };
  const from = (page - 1) * limit + 1;
  const to = Math.min(page * limit, total);
  return { from, to };
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

export async function parseCsvFilePreview(file: File): Promise<CsvFilePreview> {
  try {
    const text = await file.text();
    const lines = text.split(/\r?\n/).filter((line) => line.trim().length > 0);

    if (lines.length === 0) {
      return {
        valid: false,
        error: "Arquivo CSV vazio.",
        lineCount: 0,
        headers: [],
        sampleRows: [],
      };
    }

    const headers = parseCsvLine(lines[0]);
    const sampleRows = lines.slice(1, 4).map(parseCsvLine);

    return {
      valid: true,
      lineCount: Math.max(0, lines.length - 1),
      headers,
      sampleRows,
    };
  } catch {
    return {
      valid: false,
      error: "Não foi possível ler o arquivo CSV.",
      lineCount: 0,
      headers: [],
      sampleRows: [],
    };
  }
}

export const STATUS_CONCILIACAO_OPTIONS = [
  { value: "", label: "Todos os status" },
  { value: "extrato", label: "Extrato (sem NF)" },
  { value: "conciliado_auto", label: "Conciliado auto" },
  { value: "conciliado_manual", label: "Conciliado manual" },
  { value: "pendente_vinculo", label: "Pendente vínculo" },
  { value: "sem_match", label: "Sem correspondência" },
  { value: "ignorado", label: "Ignorado" },
];

export const BANCO_FILTER_OPTIONS = [
  { value: "", label: "Todos os bancos" },
  { value: "asaas", label: "Asaas" },
  { value: "nubank", label: "Nubank" },
];
