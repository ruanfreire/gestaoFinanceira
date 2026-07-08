import { useQuery } from "@tanstack/react-query";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { documentsApi } from "../api";
import { Button, Badge, Typography } from "@/design-system/atoms";
import { ErrorState, FriendlyErrorPanel, RelationshipTimeline } from "@/design-system/molecules";
import { Card, CardBody } from "@/design-system/organisms";
import { ROUTES } from "@/lib/constants";
import { documentosCopy } from "@/shared/copy/pt-BR";
import { formatDate, formatMoney } from "@/lib/format";
import { buildDocumentTimeline, documentStatus } from "../lib/document-ui";

const DOC_TYPE_LABELS: Record<string, string> = {
  cte: "Nota de transporte",
  nfe: "Nota fiscal",
  unknown_xml: "Documento",
  unknown: "Outros",
};

export default function DocumentoDetalhePage() {
  const { id = "" } = useParams();

  const docQuery = useQuery({
    queryKey: ["documents", id],
    queryFn: () => documentsApi.getOne(id),
    enabled: Boolean(id),
  });

  if (docQuery.isLoading) {
    return <Typography variant="body" tone="muted">Carregando documento...</Typography>;
  }

  if (docQuery.isError || !docQuery.data) {
    return (
      <ErrorState
        message="Não foi possível carregar este documento."
        onRetry={() => docQuery.refetch()}
      />
    );
  }

  const doc = docQuery.data;
  const status = documentStatus(doc);
  const typeLabel = DOC_TYPE_LABELS[doc.docType] ?? "Documento";
  const timeline = buildDocumentTimeline(doc);

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <Button variant="ghost" size="sm" asChild>
        <Link to={ROUTES.documentos}>
          <ArrowLeft className="mr-1 h-4 w-4" aria-hidden />
          Voltar para documentos
        </Link>
      </Button>

      <header className="space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <Typography variant="overline" tone="muted">
            {typeLabel}
          </Typography>
          <Badge
            variant={
              status === "ok" ? "success" : status === "error" ? "danger" : status === "warning" ? "warning" : "outline"
            }
          >
            {status === "ok" ? "Processado" : status === "error" ? "Precisa de você" : status === "warning" ? "Com aviso" : "Pendente"}
          </Badge>
        </div>
        <Typography variant="title">
          {doc.fiscalKeys?.numero ? `Documento ${doc.fiscalKeys.numero}` : doc.source?.filename ?? documentosCopy.detalheTitle}
        </Typography>
        {doc.amounts?.valorReceber != null && (
          <Typography variant="h2" className="tabular-nums">
            {formatMoney(doc.amounts.valorReceber)}
          </Typography>
        )}
        <Typography variant="caption" tone="muted">
          {doc.parties?.tomador?.nome ?? doc.parties?.emitente?.nome ?? "—"}
          {doc.dates?.emissao ? ` · ${formatDate(doc.dates.emissao)}` : doc.createdAt ? ` · ${formatDate(doc.createdAt)}` : ""}
        </Typography>
      </header>

      {!doc.validation?.ok && doc.validation?.errors?.length > 0 && (
        <FriendlyErrorPanel
          technicalDetails={doc.validation.errors.map((e) => e.message)}
          onReplace={() => window.location.assign(ROUTES.documentosEnviar)}
        />
      )}

      <Card>
        <CardBody className="space-y-4">
          <Typography variant="subtitle">Histórico</Typography>
          <RelationshipTimeline steps={timeline} />
        </CardBody>
      </Card>

      {doc.linkedDocuments && doc.linkedDocuments.length > 0 && (
        <Card>
          <CardBody className="space-y-3">
            <Typography variant="subtitle">Relacionado a</Typography>
            <ul className="space-y-2 text-caption text-muted-foreground">
              {doc.linkedDocuments.map((link, i) => (
                <li key={i}>
                  {link.type === "nfe" ? "Nota fiscal" : "Documento"}
                  {link.chaveAcesso ? ` · …${link.chaveAcesso.slice(-8)}` : ""}
                </li>
              ))}
            </ul>
          </CardBody>
        </Card>
      )}
    </div>
  );
}
