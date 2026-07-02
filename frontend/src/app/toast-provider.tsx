import { createContext, useCallback, useContext, useMemo, useState } from "react";
import { Button } from "@/design-system/atoms";

export type ToastVariant = "default" | "success" | "error";

export type ToastAction = {
  label: string;
  onClick: () => void;
};

type Toast = {
  id: string;
  message: string;
  variant?: ToastVariant;
  action?: ToastAction;
  durationMs?: number;
};

type ToastInput = {
  message: string;
  variant?: ToastVariant;
  action?: ToastAction;
  durationMs?: number;
};

type ToastContextValue = {
  toast: (message: string, variant?: ToastVariant) => void;
  showToast: (input: ToastInput) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

const DEFAULT_DURATION_MS = 3500;
const ACTION_DURATION_MS = 5000;

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback(
    ({ message, variant = "default", action, durationMs }: ToastInput) => {
      const id = crypto.randomUUID();
      const duration = durationMs ?? (action ? ACTION_DURATION_MS : DEFAULT_DURATION_MS);
      setToasts((prev) => [...prev, { id, message, variant, action, durationMs: duration }]);
      window.setTimeout(() => dismiss(id), duration);
    },
    [dismiss],
  );

  const toast = useCallback(
    (message: string, variant: ToastVariant = "default") => showToast({ message, variant }),
    [showToast],
  );

  const value = useMemo(() => ({ toast, showToast }), [toast, showToast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="pointer-events-none fixed bottom-20 left-0 right-0 z-[100] flex flex-col items-center gap-2 px-4 sm:bottom-6 lg:left-auto lg:right-6 lg:items-end">
        {toasts.map((t) => (
          <div
            key={t.id}
            role="status"
            aria-live="polite"
            className={`pointer-events-auto flex max-w-sm items-center gap-3 rounded-lg px-4 py-3 text-sm shadow-lg ${
              t.variant === "error"
                ? "bg-destructive text-destructive-foreground"
                : t.variant === "success"
                  ? "bg-success text-white"
                  : "bg-foreground text-background"
            }`}
          >
            <span className="flex-1">{t.message}</span>
            {t.action && (
              <Button
                size="sm"
                variant="outline"
                className="shrink-0 border-white/40 bg-transparent text-inherit hover:bg-white/10"
                onClick={() => {
                  t.action?.onClick();
                  dismiss(t.id);
                }}
              >
                {t.action.label}
              </Button>
            )}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within ToastProvider");
  return ctx;
}
