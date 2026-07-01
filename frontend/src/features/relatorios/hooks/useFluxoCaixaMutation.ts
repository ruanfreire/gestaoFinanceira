import { useMutation } from "@tanstack/react-query";
import { relatoriosService } from "../services/relatorios.service";
import type { FluxoCaixaFilters } from "../types/relatorios.types";

export function useExportFluxoCaixaMutation() {
  return useMutation({
    mutationFn: (filters: FluxoCaixaFilters) => relatoriosService.exportFluxoCaixa(filters),
  });
}
