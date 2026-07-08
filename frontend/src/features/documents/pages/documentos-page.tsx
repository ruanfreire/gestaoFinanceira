import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { Upload } from "lucide-react";
import { documentsApi } from "../api";
import type { DocumentListItem } from "../types";
import { Button, Typography } from "@/design-system/atoms";
import { DocumentCard, EmptyState, SearchInput, SegmentedTabs } from "@/design-system/molecules";
import { ROUTES } from "@/lib/constants";
import { documentosCopy } from "@/shared/copy/pt-BR";
import { useAuth } from "@/features/auth/context";
import {
  docTypeFilterKey,
  documentDetailPath,
  documentStatus,
  documentSubtitle,
  documentTitle,
} from "../lib/document-ui";

type InboxTab = "todos" | "pendentes" | "erro";
type TypeFilter = "all" | "nota" | "boleto" | "extrato" | "transporte" | "outros";

function filterDocuments(items: DocumentListItem[], tab: InboxTab, typeFilter: TypeFilter, search: string) {
  let list = items;

  if (tab === "pendentes") {
    list = list.filter((d) => d.validation && (!d.validation.ok || (d.validation.warnings?.length ?? 0) > 0));
  } else if (tab === "erro") {
    list = list.filter((d) => d.validation && !d.validation.ok);
  }

  const docType = docTypeFilterKey(typeFilter);
  if (docType) {
    list = list.filter((d) => d.docType === docType || (typeFilter === "outros" && !["nfe", "cte", "boleto", "extrato"].includes(d.docType)));
  }

  const q = search.trim().toLowerCase();
  if (q) {
    list = list.filter((d) => {
      const hay = [
        d.source?.filename,
        d.fiscalKeys?.numero,
        d.fiscalKeys?.chaveAcesso,
        d.parties?.tomador?.nome,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return hay.includes(q);
    });
  }

  return list;
}

export default function DocumentosPage() {
  const { user } = useAuth();
  const [tab, setTab] = useState<InboxTab>("todos");
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("all");
  const [search, setSearch] = useState("");

  const docsQuery = useQuery({
    queryKey: ["documents", "inbox"],
    queryFn: () => documentsApi.list({ limit: 100 }),
  });

  const freteCountsQuery = useQuery({
    queryKey: ["frete-conciliacao-counts"],
    queryFn: () => documentsApi.getFreteCounts(),
  });

  const items = useMemo(
    () => filterDocuments(docsQuery.data?.items ?? [], tab, typeFilter, search),
    [docsQuery.data?.items, tab, typeFilter, search],
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Typography variant="title">{documentosCopy.inboxTitle}</Typography>
          <Typography variant="body" tone="muted" className="mt-1 max-w-2xl">
            {documentosCopy.pageDescription}
          </Typography>
        </div>
        <div className="flex flex-wrap gap-2">
          {(freteCountsQuery.data?.pendentes ?? 0) > 0 && (
            <Button variant="outline" size="sm" asChild>
              <Link to={ROUTES.operacoesConfirmar}>
                {documentosCopy.pendentesLink(freteCountsQuery.data?.pendentes ?? 0)}
              </Link>
            </Button>
          )}
          <Button size="sm" asChild>
            <Link to={ROUTES.documentosEnviar}>
              <Upload className="mr-1.5 h-4 w-4" aria-hidden />
              Enviar
            </Link>
          </Button>
        </div>
      </div>

      <SegmentedTabs
        value={tab}
        onChange={(id) => setTab(id as InboxTab)}
        options={[
          { id: "todos", label: documentosCopy.tabs.todos },
          { id: "pendentes", label: documentosCopy.tabs.pendentes },
          { id: "erro", label: documentosCopy.tabs.erro },
        ]}
      />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Buscar por fornecedor, valor ou data..."
          className="sm:max-w-xs"
        />
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value as TypeFilter)}
          className="h-10 rounded-lg border border-border bg-surface px-3 text-caption"
          aria-label="Filtrar por tipo"
        >
          <option value="all">{documentosCopy.filters.all}</option>
          <option value="nota">{documentosCopy.filters.nota}</option>
          <option value="boleto">{documentosCopy.filters.boleto}</option>
          <option value="extrato">{documentosCopy.filters.extrato}</option>
          <option value="transporte">{documentosCopy.filters.transporte}</option>
          <option value="outros">{documentosCopy.filters.outros}</option>
        </select>
      </div>

      {docsQuery.isLoading && (
        <Typography variant="body" tone="muted">
          Carregando documentos...
        </Typography>
      )}

      {!docsQuery.isLoading && items.length === 0 && (
        <EmptyState
          title={documentosCopy.emptyTitle}
          description={documentosCopy.emptyDescription}
          action={
            <Button asChild>
              <Link to={ROUTES.documentosEnviar}>Enviar documentos</Link>
            </Button>
          }
        />
      )}

      <ul className="space-y-3">
        {items.map((doc) => (
          <li key={doc._id}>
            <DocumentCard
              id={doc._id}
              docType={doc.docType}
              title={documentTitle(doc)}
              subtitle={documentSubtitle(doc)}
              amount={doc.amounts?.valorReceber}
              date={doc.createdAt}
              status={documentStatus(doc)}
              to={documentDetailPath(user?.organization?.slug, doc._id)}
            />
          </li>
        ))}
      </ul>
    </div>
  );
}
