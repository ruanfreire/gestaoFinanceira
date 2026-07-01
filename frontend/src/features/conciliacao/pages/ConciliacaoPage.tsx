import { Link, useLocation, useNavigate } from "react-router-dom";
import Button from "@ui/components/ui/button/Button";
import Alert from "@ui/components/ui/alert/Alert";
import { PageHeader } from "@/shared/components/PageHeader";
import { getApiErrorMessage } from "@/shared/services/api.client";
import { useConciliacaoCounts, useConciliacaoQuery } from "../hooks/useConciliacaoQuery";
import { ConciliacaoSplitView } from "../components/ConciliacaoSplitView";
import type { ConciliacaoTab } from "../types/conciliacao.types";

function tabFromPath(pathname: string): ConciliacaoTab {
  return pathname.includes("/sem-match") ? "sem_match" : "pendentes";
}

export default function ConciliacaoPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const tab = tabFromPath(location.pathname);

  const { data: counts } = useConciliacaoCounts();
  const { data: items = [], isLoading, isError, error, refetch } = useConciliacaoQuery(tab);

  const variant = tab === "sem_match" ? "sem_match" : "pendente";
  const pendentesCount = counts?.pendentes ?? 0;
  const semMatchCount = counts?.semMatch ?? 0;

  return (
    <>
      <PageHeader
        title={tab === "sem_match" ? "Sem correspondência" : "Conciliação manual"}
        description={
          tab === "sem_match"
            ? "Pagamentos importados que o sistema não conseguiu casar automaticamente com uma NF"
            : "Escolha a nota correta para pagamentos Asaas ou Nubank — inclusive parciais"
        }
        actions={
          <div className="flex flex-wrap gap-2">
            <Link to="/importacoes-bancarias">
              <Button variant="outline">Importações</Button>
            </Link>
            <Button variant="outline" onClick={() => refetch()}>
              Atualizar
            </Button>
          </div>
        }
      />

      <div className="mb-6 flex flex-wrap gap-2">
        <Link to="/conciliacao">
          <Button variant={tab === "pendentes" ? "primary" : "outline"} size="sm">
            Pendentes ({pendentesCount})
          </Button>
        </Link>
        <Link to="/conciliacao/sem-match">
          <Button variant={tab === "sem_match" ? "primary" : "outline"} size="sm">
            Sem correspondência ({semMatchCount})
          </Button>
        </Link>
      </div>

      {isError && (
        <div className="mb-4">
          <Alert
            variant="error"
            title="Erro ao carregar"
            message={getApiErrorMessage(
              error,
              tab === "sem_match"
                ? "Não foi possível carregar lançamentos sem correspondência"
                : "Não foi possível carregar pendências",
            )}
          />
        </div>
      )}

      <ConciliacaoSplitView
        items={items}
        loading={isLoading}
        variant={variant}
        onLinked={() => {
          refetch();
          if (tab === "sem_match" && items.length <= 1) {
            navigate("/conciliacao");
          }
        }}
        emptyTitle={
          tab === "sem_match"
            ? "Nenhum lançamento sem correspondência"
            : "Nenhum pagamento pendente de vínculo"
        }
        emptyDescription={
          tab === "sem_match"
            ? "Todos os lançamentos recentes foram conciliados ou estão na fila de pendentes."
            : "Importe extratos bancários ou verifique a fila sem correspondência."
        }
      />

      {items.length === 0 && !isLoading && (
        <div className="mt-4">
          {tab === "pendentes" ? (
            <Link
              to="/conciliacao/sem-match"
              className="text-sm text-brand-600 hover:underline dark:text-brand-400"
            >
              Ver lançamentos sem correspondência →
            </Link>
          ) : (
            <Link
              to="/conciliacao"
              className="text-sm text-brand-600 hover:underline dark:text-brand-400"
            >
              Ir para conciliação manual →
            </Link>
          )}
        </div>
      )}
    </>
  );
}
