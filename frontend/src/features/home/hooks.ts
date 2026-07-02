import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { homeApi } from "./api";
import { defaultPeriodFilter } from "@/design-system/molecules";
import { queryKeys } from "@/lib/constants";

export function useHomeQuery() {
  const [filters, setFilters] = useState(defaultPeriodFilter);
  const query = useQuery({
    queryKey: queryKeys.home(filters),
    queryFn: () => homeApi.load(filters),
  });
  return { ...query, filters, setFilters };
}
