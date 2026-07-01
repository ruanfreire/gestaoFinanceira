import { describe, expect, it, vi } from "vitest";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithProviders } from "@/test/test-utils";
import { ConciliacaoItemList } from "./ConciliacaoItemList";
import type { LancamentoConciliacaoItem } from "../types/conciliacao.types";

const item: LancamentoConciliacaoItem = {
  source: "asaas",
  lancamento: {
    _id: "l1",
    data: "2024-06-01",
    valor: 500,
    descricao: "Pagamento NF",
    pagador_nome: "Empresa XYZ",
  },
  candidatas: [],
};

describe("ConciliacaoItemList", () => {
  it("marca item selecionado e dispara onSelect", async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();

    renderWithProviders(
      <ConciliacaoItemList
        items={[item]}
        selectedKey="asaas-l1"
        onSelect={onSelect}
        variant="pendente"
      />,
    );

    const option = screen.getByRole("option", { name: /Empresa XYZ/i });
    expect(option).toHaveAttribute("aria-selected", "true");

    await user.click(option);
    expect(onSelect).toHaveBeenCalledWith("asaas-l1");
  });
});
