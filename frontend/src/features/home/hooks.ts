import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { homeApi } from "./api";
import { defaultPeriodFilter } from "@/design-system/molecules";
import { queryKeys } from "@/lib/constants";
import { previousPeriodFilter } from "@/lib/period-utils";

export function useHomeQuery() {
  const [filters, setFilters] = useState(defaultPeriodFilter);
  const query = useQuery({
    queryKey: queryKeys.home(filters),
    queryFn: () => homeApi.load(filters),
    staleTime: 30_000,
  });

  const previousFilters = useMemo(() => previousPeriodFilter(filters), [filters]);
  const previousQuery = useQuery({
    queryKey: queryKeys.homePrevious(previousFilters),
    queryFn: () => homeApi.load(previousFilters),
    enabled: query.isSuccess,
    select: (data) => data.kpis,
    staleTime: 60_000,
  });

  return {
    ...query,
    filters,
    setFilters,
    previousKpis: previousQuery.data,
    previousLoading: previousQuery.isLoading,
  };
}
