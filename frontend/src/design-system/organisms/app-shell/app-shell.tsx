import { PrefetchLink, SkipToContent } from "@/design-system/molecules";
import { Home, FileText, Link2, FolderOpen, BarChart3, LogOut, Upload, FileSpreadsheet } from "lucide-react";
import { Button, Typography, Avatar, Badge } from "@/design-system/atoms";
import { cn } from "@/design-system/lib/cn";
import { ROUTES } from "@/lib/constants";
import { useAuth } from "@/features/auth/context";
import { MobileNav } from "./mobile-nav";

const sidebarNav = [
  { to: ROUTES.home, label: "Início", icon: Home },
  { to: ROUTES.notas, label: "Minhas notas", icon: FileText },
  { to: ROUTES.recebimentos, label: "Confirmar recebimentos", icon: Link2, badgeKey: "recebimentos" as const },
  {
    label: "Trazer dados",
    icon: FolderOpen,
    children: [
      { to: ROUTES.arquivosNotas, label: "Enviar notas" },
      { to: ROUTES.arquivosExtratos, label: "Enviar extrato bancário" },
      { to: ROUTES.arquivosHistorico, label: "Histórico" },
    ],
  },
  {
    label: "Análises",
    icon: BarChart3,
    children: [
      { to: ROUTES.analisesSituacao, label: "Situação das notas" },
      { to: ROUTES.analisesFluxo, label: "Fluxo de caixa" },
      { to: ROUTES.analisesConfig, label: "Config. exportação" },
    ],
  },
];

export function AppShell({
  children,
  pendingRecebimentos = 0,
}: {
  children: React.ReactNode;
  pendingRecebimentos?: number;
}) {
  const { pathname } = useLocation();
  const { user, logout } = useAuth();

  return (
    <div className="min-h-screen bg-background">
      <SkipToContent />
      <div className="lg:flex">
        <aside className="hidden w-60 shrink-0 flex-col border-r border-border bg-surface lg:fixed lg:inset-y-0 lg:flex">
          <div className="flex h-16 items-center gap-3 border-b border-border px-4">
            <img src="/images/logo/logo-icon.svg" alt="" className="h-8 w-8" aria-hidden />
            <Typography variant="subtitle">Gestão Financeira</Typography>
          </div>
          <nav className="flex-1 space-y-1 overflow-y-auto p-3" aria-label="Menu lateral">
            {sidebarNav.map((item) =>
              "children" in item && item.children ? (
                <div key={item.label} className="space-y-1">
                  <Typography variant="overline" className="flex items-center gap-2 px-3 py-2">
                    <item.icon className="h-4 w-4" aria-hidden />
                    {item.label}
                  </Typography>
                  {item.children.map((child) => (
                    <SidebarLink key={child.to} to={child.to} label={child.label} pathname={pathname} nested />
                  ))}
                </div>
              ) : (
                <SidebarLink
                  key={item.to!}
                  to={item.to!}
                  label={item.label}
                  icon={item.icon}
                  pathname={pathname}
                  badge={"badgeKey" in item && item.badgeKey === "recebimentos" ? pendingRecebimentos : undefined}
                />
              ),
            )}
          </nav>
          <div className="border-t border-border p-3">
            <div className="flex items-center gap-3 px-2 py-2">
              <Avatar name={user?.name} size="sm" />
              <div className="min-w-0">
                <Typography variant="small" className="truncate font-medium">
                  {user?.name}
                </Typography>
                <Typography variant="caption" className="truncate">
                  {user?.email}
                </Typography>
              </div>
            </div>
            <Button variant="ghost" size="sm" className="mt-2 w-full justify-start" icon={LogOut} onClick={() => logout()}>
              Sair
            </Button>
          </div>
        </aside>

        <div className="flex min-h-screen flex-1 flex-col lg:pl-60">
          <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-border bg-surface/95 px-4 backdrop-blur lg:px-6">
            <div className="flex items-center gap-2 lg:hidden">
              <img src="/images/logo/logo-icon.svg" alt="" className="h-7 w-7" aria-hidden />
              <Typography variant="subtitle">Gestão Financeira</Typography>
            </div>
            <Typography variant="small" tone="muted" className="hidden lg:block">
              Olá, <span className="font-medium text-foreground">{user?.name?.split(" ")[0]}</span>
            </Typography>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" className="hidden sm:inline-flex" asChild>
                <PrefetchLink to={ROUTES.arquivosNotas}>
                  <Upload className="h-4 w-4 shrink-0" aria-hidden />
                  Enviar notas
                </PrefetchLink>
              </Button>
              <Button variant="outline" size="sm" className="hidden md:inline-flex" asChild>
                <PrefetchLink to={ROUTES.arquivosExtratos}>
                  <FileSpreadsheet className="h-4 w-4 shrink-0" aria-hidden />
                  Enviar extrato bancário
                </PrefetchLink>
              </Button>
              <Button variant="ghost" size="icon" className="lg:hidden" onClick={() => logout()} aria-label="Sair">
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          </header>
          <main id="main-content" tabIndex={-1} className="container-app flex-1 py-4 pb-nav lg:py-6 lg:pb-6">
            {children}
          </main>
        </div>
      </div>
      <MobileNav pendingRecebimentos={pendingRecebimentos} />
    </div>
  );
}

function SidebarLink({
  to,
  label,
  icon: Icon,
  pathname,
  nested,
  badge,
}: {
  to: string;
  label: string;
  icon?: React.ComponentType<{ className?: string }>;
  pathname: string;
  nested?: boolean;
  badge?: number;
}) {
  const active = pathname === to || (to !== ROUTES.home && pathname.startsWith(to));
  return (
    <PrefetchLink
      to={to}
      className={cn(
        "flex items-center gap-2 rounded-lg px-3 py-2 text-body transition-default",
        nested && "ml-3",
        active ? "bg-accent font-medium text-accent-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground",
      )}
    >
      {Icon && <Icon className="h-4 w-4 shrink-0" aria-hidden />}
      <span className="min-w-0 flex-1 truncate">{label}</span>
      {badge != null && badge > 0 && (
        <Badge variant="danger" className="ml-auto shrink-0 tabular-nums" aria-label={`${badge} pendente(s)`}>
          {badge > 99 ? "99+" : badge}
        </Badge>
      )}
    </PrefetchLink>
  );
}
