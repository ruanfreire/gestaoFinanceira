import { describe, expect, it, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { FLUXO_DEFAULTS_STORAGE_KEY } from "../constants";
import { useFluxoDefaults } from "./use-fluxo-defaults";

describe("useFluxoDefaults", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("persiste padrões no localStorage", () => {
    const { result } = renderHook(() => useFluxoDefaults());

    act(() => {
      result.current.save({
        empresaNome: "Ana Luisa",
        empresaCnpj: "39.803.761/0001-17",
        contaCorrente: "123",
        saldoInicial: "1000",
      });
    });

    const stored = JSON.parse(window.localStorage.getItem(FLUXO_DEFAULTS_STORAGE_KEY)!);
    expect(stored.empresaNome).toBe("Ana Luisa");
  });
});
