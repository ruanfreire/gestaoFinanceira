import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { recebimentosApi } from "./api";
import { queryKeys } from "@/lib/constants";

export function useRecebimentosQuery(variant: "pendente" | "sem_match") {
  return useQuery({
    queryKey: queryKeys.recebimentos(variant),
    queryFn: () => (variant === "pendente" ? recebimentosApi.listPendentes() : recebimentosApi.listSemMatch()),
  });
}

export function useRecebimentosCounts() {
  return useQuery({
    queryKey: queryKeys.recebimentosCounts,
    queryFn: async () => {
      const [pendentes, semMatch] = await Promise.all([
        recebimentosApi.listPendentes(),
        recebimentosApi.listSemMatch(),
      ]);
      return { pendentes: pendentes.length, semMatch: semMatch.length };
    },
    staleTime: 60_000,
    refetchOnWindowFocus: false,
  });
}

export function useVincularMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      source,
      lancamentoId,
      notaId,
    }: {
      source: "asaas" | "nubank";
      lancamentoId: string;
      notaId: string;
    }) => recebimentosApi.vincular(source, lancamentoId, notaId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["recebimentos"] });
      qc.invalidateQueries({ queryKey: ["home"] });
      qc.invalidateQueries({ queryKey: ["notas"] });
      qc.invalidateQueries({ queryKey: ["arquivos"] });
    },
  });
}
