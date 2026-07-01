import { Link } from "react-router-dom";
import Alert from "@ui/components/ui/alert/Alert";
import ComponentCard from "@ui/components/common/ComponentCard";
import EmptyState from "@ui/components/ui/empty-state/EmptyState";
import type { DashboardAlert } from "../types/dashboard.types";

type DashboardAlertsProps = {
  alerts: DashboardAlert[];
};

const alertVariant: Record<DashboardAlert["type"], "success" | "warning" | "error" | "info"> = {
  warning: "warning",
  info: "info",
  error: "error",
};

export function DashboardAlerts({ alerts }: DashboardAlertsProps) {
  if (alerts.length === 0) {
    return (
      <ComponentCard title="Alertas" desc="Situação geral do sistema.">
        <EmptyState
          title="Tudo em ordem"
          description="Não há pendências críticas no momento."
        />
      </ComponentCard>
    );
  }

  return (
    <ComponentCard title="Alertas" desc="Ações recomendadas com base nos dados atuais.">
      <div className="space-y-4">
        {alerts.map((alert) => (
          <div key={alert.id} className="space-y-2">
            <Alert variant={alertVariant[alert.type]} title={alert.title} message={alert.message} />
            {alert.link && alert.linkLabel && (
              <Link
                to={alert.link}
                className="inline-block text-sm font-medium text-brand-600 hover:underline dark:text-brand-400"
              >
                {alert.linkLabel} →
              </Link>
            )}
          </div>
        ))}
      </div>
    </ComponentCard>
  );
}
