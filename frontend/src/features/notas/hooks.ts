import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { notasApi } from "./api";
import { queryKeys } from "@/lib/constants";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { useState } from "react";

export function useNotasQuery() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const q = useDebouncedValue(search.trim(), 300);

  const query = useQuery({
    queryKey: queryKeys.notas({ page, q }),
    queryFn: () => notasApi.list({ page, q: q || undefined }),
  });

  return { ...query, page, setPage, search, setSearch };
}

export function useCreateNotaMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: notasApi.create,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["notas"] });
      qc.invalidateQueries({ queryKey: ["home"] });
    },
  });
}

export function useDesvincularMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: notasApi.desvincular,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["notas"] });
      qc.invalidateQueries({ queryKey: ["home"] });
      qc.invalidateQueries({ queryKey: ["recebimentos"] });
    },
  });
}
