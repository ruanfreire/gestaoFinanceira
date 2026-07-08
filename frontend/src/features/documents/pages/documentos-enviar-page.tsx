import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Button, Badge, Typography } from "@/design-system/atoms";
import { DropzoneHero, FriendlyErrorPanel } from "@/design-system/molecules";
import { Card, CardBody, ImportSummaryModal } from "@/design-system/organisms";
import { ROUTES } from "@/lib/constants";
import { documentosCopy } from "@/shared/copy/pt-BR";
import { useDocumentIngest } from "../hooks/use-document-ingest";
import { useAuth } from "@/features/auth/context";
import { withOrgSlug } from "@/lib/org-path";

export default function DocumentosEnviarPage() {
  const { user } = useAuth();
  const ingest = useDocumentIngest();
  const pendentesHref = withOrgSlug(user?.organization?.slug, ROUTES.documentosPendentes);

  const failedItems = ingest.lastBatch?.items.filter((i) => !i.validation.ok) ?? [];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" asChild>
          <Link to={ROUTES.documentos}>
            <ArrowLeft className="mr-1 h-4 w-4" aria-hidden />
            Voltar
          </Link>
        </Button>
        <Typography variant="title">{documentosCopy.enviarTitle}</Typography>
      </div>

      <DropzoneHero
        label="Arraste arquivos ou uma pasta"
        hint={documentosCopy.dropzoneHint}
        disabled={ingest.isPending}
        onFiles={ingest.queueFiles}
      />

      {ingest.pendingFiles.length > 0 && !ingest.isPending && (
        <Card>
          <CardBody className="flex flex-wrap items-center justify-between gap-3">
            <Typography variant="body">
              {ingest.pendingFiles.length} arquivo(s) pronto(s) para importar
            </Typography>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={ingest.clearPending}>
                Limpar
              </Button>
              <Button size="sm" onClick={() => ingest.setSummaryOpen(true)}>
                Revisar e importar
              </Button>
            </div>
          </CardBody>
        </Card>
      )}

      {ingest.lastBatch && (
        <Card>
          <CardBody className="space-y-4">
            <Typography variant="subtitle">Resultado da importação</Typography>
            <div className="flex flex-wrap gap-2">
              <Badge variant="success">{ingest.lastBatch.summary.cte_ok} processado(s)</Badge>
              <Badge variant="warning">{ingest.lastBatch.summary.cte_warning} com aviso</Badge>
              <Badge variant="danger">{ingest.lastBatch.summary.failed} falha(s)</Badge>
            </div>
            {failedItems.length > 0 && (
              <ul className="space-y-3">
                {failedItems.map((item) => (
                  <li key={item.id}>
                    <FriendlyErrorPanel
                      title={`Não lemos: ${item.filename}`}
                      technicalDetails={item.validation.errors.map((e) => e.message)}
                      onReplace={ingest.clearPending}
                    />
                  </li>
                ))}
              </ul>
            )}
            {(ingest.lastBatch.summary.cte_warning > 0 || ingest.lastBatch.summary.failed > 0) && (
              <Button variant="outline" size="sm" asChild>
                <Link to={pendentesHref}>Ver pendentes</Link>
              </Button>
            )}
          </CardBody>
        </Card>
      )}

      <ImportSummaryModal
        open={ingest.summaryOpen}
        onOpenChange={ingest.setSummaryOpen}
        counts={ingest.summaryCounts}
        onConfirm={ingest.confirmIngest}
        onChoose={ingest.clearPending}
        loading={ingest.isPending}
        pendentesHref={pendentesHref}
      />
    </div>
  );
}
