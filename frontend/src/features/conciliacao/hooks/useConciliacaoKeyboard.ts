import { useEffect } from "react";

type ConciliacaoKeyboardOptions = {
  enabled?: boolean;
  onNext?: () => void;
  onPrev?: () => void;
  onConfirm?: () => void;
};

export function useConciliacaoKeyboard({
  enabled = true,
  onNext,
  onPrev,
  onConfirm,
}: ConciliacaoKeyboardOptions) {
  useEffect(() => {
    if (!enabled) return;
    const handler = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable) {
        return;
      }
      if (e.key === "j" || e.key === "ArrowDown") {
        e.preventDefault();
        onNext?.();
      }
      if (e.key === "k" || e.key === "ArrowUp") {
        e.preventDefault();
        onPrev?.();
      }
      if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        onConfirm?.();
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [enabled, onNext, onPrev, onConfirm]);
}
