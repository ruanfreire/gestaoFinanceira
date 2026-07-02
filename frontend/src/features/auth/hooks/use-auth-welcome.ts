import { useCallback, useState } from "react";

const STORAGE_KEY = "gf.auth.welcome.dismissed";

export function useAuthWelcome() {
  const [visible, setVisible] = useState(() => {
    if (typeof window === "undefined") return false;
    return !window.localStorage.getItem(STORAGE_KEY);
  });

  const dismiss = useCallback(() => {
    window.localStorage.setItem(STORAGE_KEY, "1");
    setVisible(false);
  }, []);

  return { visible, dismiss };
}
