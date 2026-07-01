import { useQuery } from "@tanstack/react-query";
import { dashboardService } from "../services/dashboard.service";
import type { DashboardFilters } from "../types/dashboard.types";

export const DASHBOARD_QUERY_KEY = ["dashboard"] as const;

export function useDashboardQuery(filters: DashboardFilters) {
  return useQuery({
    queryKey: [...DASHBOARD_QUERY_KEY, filters],
    queryFn: () => dashboardService.load(filters),
  });
}
