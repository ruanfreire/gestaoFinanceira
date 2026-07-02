import { Modal } from "../modal/modal";
import { Button } from "@/design-system/atoms";

export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = "Confirmar",
  cancelLabel = "Cancelar",
  variant = "primary",
  loading,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: "primary" | "danger";
  loading?: boolean;
  onConfirm: () => void | Promise<void>;
}) {
  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title={title}
      description={description}
      footer={
        <>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            {cancelLabel}
          </Button>
          <Button
            variant={variant === "danger" ? "danger" : "primary"}
            loading={loading}
            onClick={() => void onConfirm()}
          >
            {confirmLabel}
          </Button>
        </>
      }
    >
      <span className="sr-only">Confirmação necessária</span>
    </Modal>
  );
}
