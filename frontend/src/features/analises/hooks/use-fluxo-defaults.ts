import { useCallback, useState } from "react";
import {
  EMPTY_FLUXO_DEFAULTS,
  FLUXO_DEFAULTS_STORAGE_KEY,
  type FluxoDefaults,
} from "../constants";

function readStored(): FluxoDefaults {
  if (typeof window === "undefined") return EMPTY_FLUXO_DEFAULTS;
  try {
    const raw = window.localStorage.getItem(FLUXO_DEFAULTS_STORAGE_KEY);
    if (!raw) return EMPTY_FLUXO_DEFAULTS;
    const parsed = JSON.parse(raw) as Partial<FluxoDefaults>;
    return { ...EMPTY_FLUXO_DEFAULTS, ...parsed };
  } catch {
    return EMPTY_FLUXO_DEFAULTS;
  }
}

export function useFluxoDefaults() {
  const [defaults, setDefaults] = useState<FluxoDefaults>(readStored);

  const save = useCallback((next: FluxoDefaults) => {
    window.localStorage.setItem(FLUXO_DEFAULTS_STORAGE_KEY, JSON.stringify(next));
    setDefaults(next);
  }, []);

  const reset = useCallback(() => {
    window.localStorage.removeItem(FLUXO_DEFAULTS_STORAGE_KEY);
    setDefaults(EMPTY_FLUXO_DEFAULTS);
  }, []);

  return { defaults, save, reset };
}

export function loadFluxoDefaults(): FluxoDefaults {
  return readStored();
}
