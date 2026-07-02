import { Link, useLocation } from "react-router-dom";
import { Home, FileText, Link2, FolderOpen, BarChart3 } from "lucide-react";
import { cn } from "@/design-system/lib/cn";
import { ROUTES } from "@/lib/constants";

const mainNav = [
  { to: ROUTES.home, label: "Início", icon: Home, match: (p: string) => p === ROUTES.home },
  { to: ROUTES.notas, label: "Notas", icon: FileText, match: (p: string) => p.startsWith("/notas") },
  {
    to: ROUTES.recebimentos,
    label: "Receb.",
    icon: Link2,
    match: (p: string) => p.startsWith("/recebimentos"),
    badgeKey: "recebimentos" as const,
  },
  { to: ROUTES.arquivosHistorico, label: "Arquivos", icon: FolderOpen, match: (p: string) => p.startsWith("/arquivos") },
  { to: ROUTES.analisesSituacao, label: "Mais", icon: BarChart3, match: (p: string) => p.startsWith("/analises") },
];

export function MobileNav({ pendingRecebimentos = 0 }: { pendingRecebimentos?: number }) {
  const { pathname } = useLocation();
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-border bg-surface safe-bottom lg:hidden" aria-label="Navegação principal">
      <div className="flex h-16 items-stretch justify-around">
        {mainNav.map(({ to, label, icon: Icon, match, badgeKey }) => {
          const active = match(pathname);
          const badge = badgeKey === "recebimentos" ? pendingRecebimentos : 0;
          return (
            <Link
              key={to}
              to={to}
              className={cn(
                "relative flex min-w-0 flex-1 flex-col items-center justify-center gap-1 px-1 text-overline font-medium",
                active ? "text-primary" : "text-muted-foreground",
              )}
            >
              <span className="relative">
                <Icon className={cn("h-5 w-5", active && "text-primary")} aria-hidden />
                {badge > 0 && (
                  <span
                    className="absolute -right-2 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold text-white"
                    aria-label={`${badge} pendente(s)`}
                  >
                    {badge > 9 ? "9+" : badge}
                  </span>
                )}
              </span>
              <span className="truncate">{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
