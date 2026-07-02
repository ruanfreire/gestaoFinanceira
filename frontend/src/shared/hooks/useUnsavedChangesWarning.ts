import { useEffect } from "react";

export function useUnsavedChangesWarning(when: boolean, message = "Há alterações não salvas. Deseja sair?") {
  useEffect(() => {
    if (!when) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = message;
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [when, message]);
}
