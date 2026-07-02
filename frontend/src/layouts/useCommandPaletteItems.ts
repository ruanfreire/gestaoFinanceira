import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import type { CommandItem } from "@ui/components/ui/command-palette/CommandPalette";
import { navigationGroups } from "./navigation";

export function useCommandPaletteItems(): CommandItem[] {
  const navigate = useNavigate();

  return useMemo(() => {
    const navItems: CommandItem[] = navigationGroups.flatMap((group) =>
      group.items.map((item) => ({
        id: `nav-${item.path}`,
        label: item.name,
        description: item.path,
        group: group.label,
        keywords: [group.label, item.name],
        onSelect: () => navigate(item.path),
      })),
    );

    const actions: CommandItem[] = [
      {
        id: "action-nova-nota",
        label: "Nova nota fiscal",
        group: "Ações rápidas",
        keywords: ["criar", "nota"],
        onSelect: () => navigate("/notas/new"),
      },
      {
        id: "action-importar-json",
        label: "Importar notas (JSON)",
        group: "Ações rápidas",
        onSelect: () => navigate("/importacoes"),
      },
      {
        id: "action-importar-csv",
        label: "Importar extrato (CSV)",
        group: "Ações rápidas",
        onSelect: () => navigate("/importacoes-bancarias"),
      },
      {
        id: "action-conciliar",
        label: "Conciliação bancária",
        group: "Ações rápidas",
        onSelect: () => navigate("/conciliacao"),
      },
      {
        id: "action-extracao",
        label: "Relatório — Extração de notas",
        group: "Relatórios",
        onSelect: () => navigate("/relatorios/extracao"),
      },
      {
        id: "action-fluxo",
        label: "Relatório — Fluxo de caixa",
        group: "Relatórios",
        onSelect: () => navigate("/relatorios/fluxo-caixa"),
      },
    ];

    return [...actions, ...navItems];
  }, [navigate]);
}
