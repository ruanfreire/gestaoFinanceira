import { describe, expect, it } from "vitest";
import { screen } from "@testing-library/react";
import { renderWithProviders } from "@/test/test-utils";
import { PageHeader } from "./PageHeader";

describe("PageHeader", () => {
  it("renderiza título e descrição", () => {
    renderWithProviders(
      <PageHeader title="Notas fiscais" description="Listagem e gestão de NF" />,
    );

    expect(screen.getByRole("heading", { name: "Notas fiscais" })).toBeInTheDocument();
    expect(screen.getByText("Listagem e gestão de NF")).toBeInTheDocument();
  });
});
