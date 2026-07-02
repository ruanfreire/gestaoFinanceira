import { useEffect } from "react";
import { Link, Outlet, useLocation } from "react-router-dom";
import { Bell, LayoutDashboard, Users, LogOut } from "lucide-react";
import { Button, Typography, Badge } from "@/design-system/atoms";
import { useAuth } from "@/features/auth/context";
import { ROUTES } from "@/lib/constants";
import { cn } from "@/design-system/lib/cn";
import { useUnreadNotifications, useNotifications } from "../hooks";
import { useState } from "react";
import { formatDateTime } from "@/lib/format";
import { platformApi } from "../api";
import { registerPushNotifications } from "@/lib/push-notifications";

const NAV = [
  { to: ROUTES.superadmin, label: "Painel", icon: LayoutDashboard, exact: true },
  { to: ROUTES.superadminClients, label: "Clientes", icon: Users },
];

export function SuperadminShell() {
  const { user, logout } = useAuth();
  const { pathname } = useLocation();
  const { data: unread = 0 } = useUnreadNotifications();
  const { data: notifications = [], refetch } = useNotifications();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    registerPushNotifications().catch(() => undefined);
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-30 border-b border-border bg-surface/95 backdrop-blur">
        <div className="container-app flex h-14 items-center justify-between gap-4">
          <Typography variant="subtitle">SuperAdmin</Typography>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Button
                type="button"
                variant="outline"
                size="sm"
                aria-label="Notificações"
                onClick={() => setOpen((v) => !v)}
              >
                <Bell className="h-4 w-4" aria-hidden />
                {unread > 0 && (
                  <Badge variant="danger" className="ml-1 tabular-nums">
                    {unread > 9 ? "9+" : unread}
                  </Badge>
                )}
              </Button>
              {open && (
                <div className="absolute right-0 top-full z-50 mt-2 w-80 rounded-xl border border-border bg-surface p-3 shadow-lg">
                  <div className="mb-2 flex items-center justify-between">
                    <Typography variant="subtitle">Notificações</Typography>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={async () => {
                        await platformApi.markAllRead();
                        refetch();
                      }}
                    >
                      Marcar todas
                    </Button>
                  </div>
                  <ul className="max-h-64 space-y-2 overflow-y-auto">
                    {notifications.length === 0 ? (
                      <Typography variant="caption" tone="muted">
                        Nenhuma notificação
                      </Typography>
                    ) : (
                      notifications.slice(0, 10).map((n) => (
                        <li key={n._id} className="rounded-lg border border-border p-2">
                          <Typography variant="small" className="font-medium">
                            {n.title}
                          </Typography>
                          <Typography variant="caption" tone="muted">
                            {n.message}
                          </Typography>
                          <Typography variant="caption" tone="muted" className="mt-1 block">
                            {formatDateTime(n.createdAt)}
                          </Typography>
                        </li>
                      ))
                    )}
                  </ul>
                </div>
              )}
            </div>
            <Button type="button" variant="ghost" size="sm" onClick={() => logout()}>
              <LogOut className="h-4 w-4" aria-hidden />
              Sair
            </Button>
          </div>
        </div>
        <nav className="container-app flex gap-2 pb-3" aria-label="SuperAdmin">
          {NAV.map((item) => {
            const active = item.exact ? pathname === item.to : pathname.startsWith(item.to);
            return (
              <Link
                key={item.to}
                to={item.to}
                className={cn(
                  "inline-flex items-center gap-2 rounded-lg px-3 py-2 text-small font-medium transition-default",
                  active ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted",
                )}
              >
                <item.icon className="h-4 w-4" aria-hidden />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </header>
      <main className="container-app py-6">
        <Typography variant="caption" tone="muted" className="mb-4 block">
          {user?.name} · {user?.email}
        </Typography>
        <Outlet />
      </main>
    </div>
  );
}
