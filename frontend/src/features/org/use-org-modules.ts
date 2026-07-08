import { useMemo } from "react";
import { useAuth } from "@/features/auth/context";
import type { ModuleKey } from "@/lib/modules";
import { hasModule as checkModule } from "@/lib/modules";

export function useOrgModules() {
  const { user } = useAuth();

  const enabledModules = useMemo(
    () => user?.organization?.enabled_modules ?? ["finance"],
    [user?.organization?.enabled_modules],
  );

  const hasModule = (moduleKey: ModuleKey) => checkModule(enabledModules, moduleKey);

  return { enabledModules, hasModule };
}
