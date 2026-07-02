import { describe, expect, it, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useAuthWelcome } from "./use-auth-welcome";

describe("useAuthWelcome", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("exibe boas-vindas na primeira visita", () => {
    const { result } = renderHook(() => useAuthWelcome());
    expect(result.current.visible).toBe(true);
  });

  it("oculta após dismiss", () => {
    const { result } = renderHook(() => useAuthWelcome());
    act(() => result.current.dismiss());
    expect(result.current.visible).toBe(false);
    expect(window.localStorage.getItem("gf.auth.welcome.dismissed")).toBe("1");
  });
});
