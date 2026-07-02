import { useState } from "react";
import { Link } from "react-router-dom";
import Badge from "@ui/components/ui/badge/Badge";
import { Dropdown } from "@ui/components/ui/dropdown/Dropdown";
import { useDashboardQuery } from "@/features/dashboard/hooks/useDashboardQuery";
import { createDefaultDashboardFilters } from "@/features/dashboard/components/DashboardFiltersBar";

export default function HeaderNotifications() {
  const [open, setOpen] = useState(false);
  const { data } = useDashboardQuery(createDefaultDashboardFilters());
  const alerts = data?.alerts ?? [];
  const count = alerts.length;

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="relative flex h-10 w-10 items-center justify-center rounded-lg border border-gray-200 text-gray-500 transition hover:bg-gray-50 dark:border-gray-800 dark:text-gray-400 dark:hover:bg-white/5 lg:h-11 lg:w-11"
        aria-label={count > 0 ? `${count} notificações` : "Notificações"}
        aria-expanded={open}
      >
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6 6 0 10-12 0v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
          />
        </svg>
        {count > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-error-500 px-1 text-[10px] font-semibold text-white">
            {count > 9 ? "9+" : count}
          </span>
        )}
      </button>
      <Dropdown isOpen={open} onClose={() => setOpen(false)} className="right-0 mt-2 w-80 p-0">
        <div className="border-b border-gray-100 px-4 py-3 dark:border-gray-800">
          <p className="text-sm font-semibold text-gray-800 dark:text-white/90">Notificações</p>
        </div>
        {alerts.length === 0 ? (
          <p className="px-4 py-6 text-center text-sm text-gray-500">Nenhuma pendência no momento</p>
        ) : (
          <ul className="max-h-72 overflow-y-auto py-1">
            {alerts.map((alert) => (
              <li key={alert.id} className="border-b border-gray-50 px-4 py-3 last:border-0 dark:border-gray-800/60">
                <div className="flex items-start gap-2">
                  <Badge
                    color={
                      alert.type === "error"
                        ? "error"
                        : alert.type === "warning"
                          ? "warning"
                          : "info"
                    }
                    size="sm"
                  >
                    {alert.type === "error" ? "!" : alert.type === "warning" ? "⚠" : "i"}
                  </Badge>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-gray-800 dark:text-white/90">{alert.title}</p>
                    <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">{alert.message}</p>
                    {alert.link && alert.linkLabel && (
                      <Link
                        to={alert.link}
                        onClick={() => setOpen(false)}
                        className="mt-1 inline-block text-xs font-medium text-brand-600 hover:underline dark:text-brand-400"
                      >
                        {alert.linkLabel} →
                      </Link>
                    )}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Dropdown>
    </div>
  );
}
