import { useDesvincularMutation } from "@/features/notas/hooks";
import { useToast } from "@/app/toast-provider";
import type { BancoSource } from "../types";

export function useConciliacaoUndo() {
  const desvincular = useDesvincularMutation();
  const { showToast } = useToast();

  const showSuccessWithUndo = (
    notaId: string,
    lancamentoId: string,
    source: BancoSource,
    message = "Recebimento confirmado",
  ) => {
    showToast({
      message,
      variant: "success",
      action: {
        label: "Desfazer",
        onClick: () => {
          void desvincular.mutateAsync({ nota_id: notaId, lancamento_id: lancamentoId, source }).catch(() => {
            showToast({ message: "Não foi possível desfazer", variant: "error" });
          });
        },
      },
    });
  };

  return { showSuccessWithUndo, isUndoing: desvincular.isPending };
}
