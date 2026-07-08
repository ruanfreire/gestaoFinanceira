import { Navigate } from "react-router-dom";
import { useToast } from "@/app/toast-provider";
import { ROUTES } from "@/lib/constants";
import { useOrgPath } from "@/features/org/org-slug-context";
import type { ModuleKey } from "@/lib/modules";
import { useOrgModules } from "./use-org-modules";
import { useEffect, useRef } from "react";

export function RequireModule({
  module,
  children,
}: {
  module: ModuleKey;
  children: React.ReactNode;
}) {
  const { hasModule } = useOrgModules();
  const orgPath = useOrgPath();
  const { toast } = useToast();
  const notified = useRef(false);

  useEffect(() => {
    if (!hasModule(module) && !notified.current) {
      notified.current = true;
      toast("Este módulo não está disponível para sua organização.", "error");
    }
  }, [hasModule, module, toast]);

  if (!hasModule(module)) {
    return <Navigate to={orgPath(ROUTES.home)} replace />;
  }

  return <>{children}</>;
}
