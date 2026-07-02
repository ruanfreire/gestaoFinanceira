import { describe, expect, it, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useRecebimentosOnboarding } from "./use-recebimentos-onboarding";

describe("useRecebimentosOnboarding", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("exibe onboarding na primeira visita", () => {
    const { result } = renderHook(() => useRecebimentosOnboarding());
    expect(result.current.visible).toBe(true);
  });

  it("oculta após dismiss e persiste no localStorage", () => {
    const { result } = renderHook(() => useRecebimentosOnboarding());
    act(() => result.current.dismiss());
    expect(result.current.visible).toBe(false);
    expect(window.localStorage.getItem("gf.recebimentos.onboarding.dismissed")).toBe("1");
  });

  it("não exibe se já foi dispensado", () => {
    window.localStorage.setItem("gf.recebimentos.onboarding.dismissed", "1");
    const { result } = renderHook(() => useRecebimentosOnboarding());
    expect(result.current.visible).toBe(false);
  });
});
