import { describe, expect, it } from "vitest";
import { screen } from "@testing-library/react";
import { renderWithProviders } from "@/test/test-utils";
import ExtracaoNotasPage from "./ExtracaoNotasPage";

describe("ExtracaoNotasPage", () => {
  it("renderiza filtros e botão de gerar relatório", () => {
    renderWithProviders(<ExtracaoNotasPage />);

    expect(screen.getByRole("heading", { name: "Extração de Notas" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Gerar relatório" })).toBeInTheDocument();
    expect(screen.getByText("Por mês de pagamento")).toBeInTheDocument();
  });
});
