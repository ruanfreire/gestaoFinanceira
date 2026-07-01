import { useCallback, useState } from "react";
import ConfirmDialog from "@ui/components/ui/confirm-dialog/ConfirmDialog";

type ConfirmOptions = {
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: "danger" | "primary";
};

type ConfirmState = ConfirmOptions & {
  open: boolean;
  resolve: ((value: boolean) => void) | null;
};

const initialState: ConfirmState = {
  open: false,
  title: "",
  resolve: null,
};

/** Hook para diálogos de confirmação sem window.confirm */
export function useConfirm() {
  const [state, setState] = useState<ConfirmState>(initialState);
  const [loading, setLoading] = useState(false);

  const confirm = useCallback((options: ConfirmOptions) => {
    return new Promise<boolean>((resolve) => {
      setState({ ...options, open: true, resolve });
    });
  }, []);

  const handleClose = useCallback(() => {
    state.resolve?.(false);
    setState(initialState);
    setLoading(false);
  }, [state]);

  const handleConfirm = useCallback(() => {
    state.resolve?.(true);
    setState(initialState);
    setLoading(false);
  }, [state]);

  const dialog = (
    <ConfirmDialog
      isOpen={state.open}
      onClose={handleClose}
      onConfirm={handleConfirm}
      title={state.title}
      description={state.description}
      confirmLabel={state.confirmLabel}
      cancelLabel={state.cancelLabel}
      variant={state.variant}
      loading={loading}
    />
  );

  return { confirm, dialog };
}
