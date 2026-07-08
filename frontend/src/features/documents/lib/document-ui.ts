import type { DocumentCardStatus } from "@/design-system/molecules";
import type { DocumentListItem, IngestItemResult } from "@/features/documents/types";
import { ROUTES } from "@/lib/constants";
import { withOrgSlug } from "@/lib/org-path";

const DOC_TYPE_FILTER_MAP: Record<string, string | undefined> = {
  all: undefined,
  nota: "nfe",
  boleto: "boleto",
  extrato: "extrato",
  transporte: "cte",
  outros: "unknown",
};

export function docTypeFilterKey(key: string) {
  return DOC_TYPE_FILTER_MAP[key];
}

export function documentStatus(item: DocumentListItem | IngestItemResult): DocumentCardStatus {
  if (!item.validation) return "pending";
  if (!item.validation.ok) return "error";
  if (item.validation.warnings?.length) return "warning";
  return "ok";
}

export function documentTitle(item: DocumentListItem | IngestItemResult): string {
  const numero = item.fiscalKeys?.numero;
  if (numero) return `Documento ${numero}`;
  return item.source?.filename ?? (item as IngestItemResult).filename ?? "Documento";
}

export function documentSubtitle(item: DocumentListItem | IngestItemResult): string | undefined {
  return item.parties?.tomador?.nome ?? item.parties?.emitente?.nome;
}

export function classifyFilesForSummary(files: File[]) {
  const byType: Record<string, number> = {
    XML: 0,
    PDF: 0,
    ZIP: 0,
    outros: 0,
  };
  for (const f of files) {
    const ext = f.name.split(".").pop()?.toLowerCase() ?? "";
    if (ext === "xml") byType.XML += 1;
    else if (ext === "pdf") byType.PDF += 1;
    else if (ext === "zip") byType.ZIP += 1;
    else byType.outros += 1;
  }
  const labels: Record<string, number> = {};
  if (byType.XML) labels.XML = byType.XML;
  if (byType.PDF) labels.PDF = byType.PDF;
  if (byType.ZIP) labels.ZIP = byType.ZIP;
  if (byType.outros) labels["outros arquivos"] = byType.outros;
  return labels;
}

export function documentDetailPath(orgSlug: string | undefined, id: string) {
  return withOrgSlug(orgSlug, ROUTES.documentoDetalhe(id));
}

export function buildDocumentTimeline(
  doc: {
    source?: { filename?: string; ingestedAt?: string };
    validation?: { ok: boolean };
    links?: Array<{ rel: string; targetDocumentId: string }>;
    linkedDocuments?: Array<{ type: string; chaveAcesso?: string }>;
  },
) {
  const steps = [
    {
      id: "recebido",
      label: "Documento recebido",
      description: doc.source?.filename,
      done: true,
    },
    {
      id: "processado",
      label: "Leitura automática",
      description: doc.validation?.ok ? "Concluída" : "Com pendências",
      done: Boolean(doc.validation?.ok),
      current: !doc.validation?.ok,
    },
  ];

  const linkCount = (doc.links?.length ?? 0) + (doc.linkedDocuments?.length ?? 0);
  if (linkCount > 0) {
    steps.push({
      id: "relacionado",
      label: "Relacionamentos",
      description: `${linkCount} documento(s) vinculado(s)`,
      done: true,
    });
  }

  return steps;
}
