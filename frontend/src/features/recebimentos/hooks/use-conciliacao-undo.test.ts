import { describe, expect, it, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useConciliacaoUndo } from "./use-conciliacao-undo";

const mutateAsync = vi.fn();
const showToast = vi.fn();

vi.mock("@/features/notas/hooks", () => ({
  useDesvincularMutation: () => ({
    mutateAsync,
    isPending: false,
  }),
}));

vi.mock("@/app/toast-provider", () => ({
  useToast: () => ({ showToast, toast: vi.fn() }),
}));

describe("useConciliacaoUndo", () => {
  beforeEach(() => {
    mutateAsync.mockReset();
    showToast.mockReset();
    mutateAsync.mockResolvedValue(undefined);
  });

  it("exibe toast de sucesso com ação Desfazer", () => {
    const { result } = renderHook(() => useConciliacaoUndo());

    act(() => {
      result.current.showSuccessWithUndo("nota1", "lanc1");
    });

    expect(showToast).toHaveBeenCalledWith(
      expect.objectContaining({
        message: "Recebimento confirmado",
        variant: "success",
        action: expect.objectContaining({ label: "Desfazer" }),
      }),
    );
  });

  it("chama desvincular ao clicar em Desfazer", async () => {
    const { result } = renderHook(() => useConciliacaoUndo());

    act(() => {
      result.current.showSuccessWithUndo("nota1", "lanc1");
    });

    const call = showToast.mock.calls[0][0] as {
      action: { onClick: () => void };
    };
    await act(async () => {
      call.action.onClick();
    });

    expect(mutateAsync).toHaveBeenCalledWith({
      nota_id: "nota1",
      lancamento_id: "lanc1",
    });
  });
});
