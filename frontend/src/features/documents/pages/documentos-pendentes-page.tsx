import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { documentsApi } from "../api";
import { Button, Typography } from "@/design-system/atoms";
import { DocumentCard, EmptyState } from "@/design-system/molecules";
import { ROUTES } from "@/lib/constants";
import { documentosCopy } from "@/shared/copy/pt-BR";
import { useAuth } from "@/features/auth/context";
import {
  documentDetailPath,
  documentStatus,
  documentSubtitle,
  documentTitle,
} from "../lib/document-ui";

export default function DocumentosPendentesPage() {
  const { user } = useAuth();

  const docsQuery = useQuery({
    queryKey: ["documents", "pendentes"],
    queryFn: () => documentsApi.list({ limit: 100 }),
  });

  const items = useMemo(
    () =>
      (docsQuery.data?.items ?? []).filter(
        (d) => d.validation && (!d.validation.ok || (d.validation.warnings?.length ?? 0) > 0),
      ),
    [docsQuery.data?.items],
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" asChild>
          <Link to={ROUTES.documentos}>
            <ArrowLeft className="mr-1 h-4 w-4" aria-hidden />
            Voltar
          </Link>
        </Button>
        <Typography variant="title">{documentosCopy.pendentesTitle}</Typography>
      </div>

      {items.length === 0 ? (
        <EmptyState
          title="Nada pendente"
          description="Todos os documentos foram processados."
          action={
            <Button variant="outline" asChild>
              <Link to={ROUTES.documentos}>Ver todos</Link>
            </Button>
          }
        />
      ) : (
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
      )}
    </div>
  );
}
