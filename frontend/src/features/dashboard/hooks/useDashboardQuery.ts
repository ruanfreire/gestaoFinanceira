import { useQuery } from "@tanstack/react-query";
import { queryKeys, DASHBOARD_QUERY_KEY } from "@/shared/constants/query-keys";
import { dashboardService } from "../services/dashboard.service";
import type { DashboardFilters } from "../types/dashboard.types";

export { DASHBOARD_QUERY_KEY };

export function useDashboardQuery(filters: DashboardFilters) {
  return useQuery({
    queryKey: queryKeys.dashboard.detail(filters),
    queryFn: () => dashboardService.load(filters),
  });
}
