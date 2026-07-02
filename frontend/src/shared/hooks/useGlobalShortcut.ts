import { useEffect } from "react";

export function useGlobalShortcut(
  key: string,
  callback: () => void,
  options?: { ctrl?: boolean; meta?: boolean },
) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const ctrl = options?.ctrl ?? false;
      const meta = options?.meta ?? false;
      const modifierOk =
        (ctrl ? e.ctrlKey || e.metaKey : true) && (meta ? e.metaKey : true);
      if (modifierOk && e.key.toLowerCase() === key.toLowerCase()) {
        e.preventDefault();
        callback();
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [key, callback, options?.ctrl, options?.meta]);
}
