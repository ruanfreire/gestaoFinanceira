import { ReactNode } from "react";
import { Modal } from "../modal";
import Button from "../button/Button";

type ConfirmDialogProps = {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description?: string | ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: "danger" | "primary";
  loading?: boolean;
};

export default function ConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  confirmLabel = "Confirmar",
  cancelLabel = "Cancelar",
  variant = "primary",
  loading = false,
}: ConfirmDialogProps) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} className="max-w-md p-6" showCloseButton={false}>
      <h2 className="text-lg font-semibold text-gray-800 dark:text-white/90">{title}</h2>
      {description && (
        <div className="mt-2 text-sm text-gray-600 dark:text-gray-400">{description}</div>
      )}
      <div className="mt-6 flex justify-end gap-3">
        <Button variant="outline" onClick={onClose} disabled={loading}>
          {cancelLabel}
        </Button>
        <Button
          onClick={onConfirm}
          disabled={loading}
          className={
            variant === "danger"
              ? "bg-error-500 hover:bg-error-600 disabled:bg-error-300"
              : ""
          }
        >
          {loading ? "Aguarde..." : confirmLabel}
        </Button>
      </div>
    </Modal>
  );
}
