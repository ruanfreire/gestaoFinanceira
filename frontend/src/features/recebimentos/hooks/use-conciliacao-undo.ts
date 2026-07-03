import { useDesvincularMutation } from "@/features/notas/hooks";
import { useToast } from "@/app/toast-provider";

export function useConciliacaoUndo() {
  const desvincular = useDesvincularMutation();
  const { showToast } = useToast();

  const showSuccessWithUndo = (notaId: string, lancamentoId: string, message = "Recebimento confirmado") => {
    showToast({
      message,
      variant: "success",
      action: {
        label: "Desfazer",
        onClick: () => {
          void desvincular.mutateAsync({ nota_id: notaId, lancamento_id: lancamentoId }).catch(() => {
            showToast({ message: "Não foi possível desfazer", variant: "error" });
          });
        },
      },
    });
  };

  return { showSuccessWithUndo, isUndoing: desvincular.isPending };
}
