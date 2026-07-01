import { describe, expect, it } from "vitest";
import { screen } from "@testing-library/react";
import { renderWithProviders } from "@/test/test-utils";
import { DataTable } from "./DataTable";

type Row = { id: string; nome: string };

const columns = [
  { key: "nome", header: "Nome", cell: (row: Row) => row.nome },
];

describe("DataTable", () => {
  it("exibe estado vazio", () => {
    renderWithProviders(
      <DataTable
        columns={columns}
        data={[]}
        rowKey={(row) => row.id}
        emptyTitle="Nada por aqui"
        ariaLabel="Tabela de exemplo"
      />,
    );

    expect(screen.getByText("Nada por aqui")).toBeInTheDocument();
    expect(screen.getByText("Tabela de exemplo")).toBeInTheDocument();
  });

  it("renderiza linhas", () => {
    renderWithProviders(
      <DataTable
        columns={columns}
        data={[{ id: "1", nome: "Cliente A" }]}
        rowKey={(row) => row.id}
      />,
    );

    expect(screen.getByText("Cliente A")).toBeInTheDocument();
  });
});
