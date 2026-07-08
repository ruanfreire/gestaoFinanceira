import { Link } from "react-router-dom";
import { useDocumentIngest } from "@/features/documents/hooks/use-document-ingest";
import { DropzoneHero } from "@/design-system/molecules";
import { ImportSummaryModal } from "@/design-system/organisms";
import { documentosCopy } from "@/shared/copy/pt-BR";
import { ROUTES } from "@/lib/constants";
import { useAuth } from "@/features/auth/context";
import { withOrgSlug } from "@/lib/org-path";
import { useOrgModules } from "@/features/org/use-org-modules";

export function HomeDropzoneSection() {
  const { user } = useAuth();
  const { hasModule } = useOrgModules();
  const ingest = useDocumentIngest();

  if (!hasModule("document_core")) {
    return (
      <div className="rounded-2xl border border-border bg-surface-sunken/50 p-6 text-center">
        <p className="text-caption text-muted-foreground">
          Envie notas e extratos em{" "}
          <Link to={ROUTES.financeiroEnviarNotas} className="font-medium text-primary underline">
            Financeiro → Enviar
          </Link>
        </p>
      </div>
    );
  }

  const pendentesHref = withOrgSlug(user?.organization?.slug, ROUTES.documentosPendentes);

  return (
    <>
      <DropzoneHero
        label={documentosCopy.homeDropzoneLabel}
        hint={documentosCopy.homeDropzoneHint}
        disabled={ingest.isPending}
        onFiles={ingest.queueFiles}
      />
      <ImportSummaryModal
        open={ingest.summaryOpen}
        onOpenChange={ingest.setSummaryOpen}
        counts={ingest.summaryCounts}
        onConfirm={ingest.confirmIngest}
        onChoose={ingest.clearPending}
        loading={ingest.isPending}
        pendentesHref={pendentesHref}
      />
    </>
  );
}
