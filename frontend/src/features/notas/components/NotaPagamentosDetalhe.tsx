import { useState } from "react";
import Alert from "@ui/components/ui/alert/Alert";
import { useToast } from "@ui/components/ui/toast/ToastContext";
import { useConfirm } from "@/shared/hooks/useConfirm";
import { getApiErrorMessage } from "@/shared/services/api.client";
import {
  formatCurrency,
  formatDate,
  type PagamentoResumo,
} from "@/utils/nota-format.util";
import { useDesvincularPagamentoMutation } from "../hooks/useNotaMutations";
import { PagamentoSourceBadge } from "./NotaPaymentStatusBadge";

type NotaPagamentosDetalheProps = {
  notaId: string;
  pagamentos: PagamentoResumo[];
};

export function NotaPagamentosDetalhe({ notaId, pagamentos }: NotaPagamentosDetalheProps) {
  const { confirm, dialog } = useConfirm();
  const toast = useToast();
  const mutation = useDesvincularPagamentoMutation();
  const [unlinkingId, setUnlinkingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleDesvincular = async (pagamento: PagamentoResumo) => {
    const lancamentoId = pagamento.lancamento_id;
    const source = pagamento.source;
    if (!lancamentoId || !source) return;

    const label = `${source === "nubank" ? "Nubank" : "Asaas"} · ${formatDate(pagamento.data)} · ${formatCurrency(pagamento.valor)}`;
    const accepted = await confirm({
      title: "Desvincular pagamento?",
      description: `${label}\n\nA NF será reaberta e o lançamento voltará para conciliação manual.`,
      confirmLabel: "Desvincular",
      variant: "danger",
    });

    if (!accepted) return;

    setUnlinkingId(lancamentoId);
    setError(null);

    try {
      await mutation.mutateAsync({
        nota_id: notaId,
        lancamento_id: lancamentoId,
        source,
      });
      toast.showToast({ variant: "success", title: "Pagamento desvinculado com sucesso." });
    } catch (err) {
      const msg = getApiErrorMessage(err, "Não foi possível desvincular o pagamento");
      setError(msg);
      toast.showToast({ variant: "error", title: msg });
    } finally {
      setUnlinkingId(null);
    }
  };

  return (
    <>
      {dialog}
      <div className="bg-gray-50 px-4 py-3 dark:bg-gray-900/50">
        <p className="mb-2 text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
          Pagamentos vinculados ({pagamentos.length})
        </p>
        {error && (
          <div className="mb-2">
            <Alert variant="error" title="Erro" message={error} />
          </div>
        )}
        <div className="space-y-2">
          {pagamentos.map((pagamento, index) => {
            const lancamentoId = pagamento.lancamento_id || `idx-${index}`;
            const isUnlinking = unlinkingId === pagamento.lancamento_id;

            return (
              <div
                key={`${pagamento.source}-${lancamentoId}-${index}`}
                className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-gray-700 dark:text-gray-300"
              >
                <PagamentoSourceBadge source={pagamento.source} />
                <span>{formatDate(pagamento.data)}</span>
                <span className="font-medium">{formatCurrency(pagamento.valor)}</span>
                {(pagamento.pagador_nome || pagamento.descricao) && (
                  <span className="text-gray-500 dark:text-gray-400">
                    {pagamento.pagador_nome || pagamento.descricao}
                  </span>
                )}
                {pagamento.lancamento_id && pagamento.source && (
                  <button
                    type="button"
                    onClick={() => handleDesvincular(pagamento)}
                    disabled={isUnlinking || mutation.isPending}
                    className="text-xs text-red-600 hover:underline disabled:opacity-50 dark:text-red-400"
                  >
                    {isUnlinking ? "Desvinculando..." : "Desvincular"}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
}
