import { useLocation } from "react-router-dom";
import { Home, Wallet, Link2, FolderOpen, BarChart3, Settings, FileStack } from "lucide-react";
import { PrefetchLink } from "@/design-system/molecules";
import { cn } from "@/design-system/lib/cn";
import { ROUTES } from "@/lib/constants";
import { navCopy } from "@/shared/copy/pt-BR";
import { useOrgModules } from "@/features/org/use-org-modules";
import { hasModule } from "@/lib/modules";

const mainNav = [
  { to: ROUTES.home, label: navCopy.inicio, icon: Home, match: (p: string) => p === ROUTES.home },
  {
    to: ROUTES.documentos,
    label: navCopy.documentos,
    icon: FileStack,
    match: (p: string) => p.startsWith("/documentos"),
    module: "document_core" as const,
  },
  {
    to: ROUTES.financeiroNotas,
    label: "Notas",
    icon: Wallet,
    match: (p: string) => p.startsWith("/financeiro"),
    module: "finance" as const,
  },
  {
    to: ROUTES.financeiroConfirmar,
    label: "Receb.",
    icon: Link2,
    match: (p: string) => p.startsWith("/financeiro/confirmar"),
    badgeKey: "recebimentos" as const,
    module: "finance" as const,
  },
  {
    to: ROUTES.financeiroHistorico,
    label: "Arquivos",
    icon: FolderOpen,
    match: (p: string) => p.startsWith("/financeiro/historico") || p.startsWith("/financeiro/enviar"),
    module: "finance" as const,
  },
  {
    to: ROUTES.relatoriosSituacao,
    label: "Mais",
    icon: BarChart3,
    match: (p: string) => p.startsWith("/relatorios"),
    module: "finance" as const,
  },
];

const ownerNavItem = {
  to: ROUTES.configuracoes,
  label: "Config.",
  icon: Settings,
  match: (p: string) => p.startsWith("/configuracoes"),
};

export function MobileNav({
  pendingRecebimentos = 0,
  isOwner = false,
}: {
  pendingRecebimentos?: number;
  isOwner?: boolean;
}) {
  const { pathname } = useLocation();
  const { enabledModules } = useOrgModules();

  const filtered = mainNav.filter((item) => !item.module || hasModule(enabledModules, item.module));
  const items = isOwner
    ? [...filtered.slice(0, -1), ownerNavItem]
    : filtered;

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-border bg-surface safe-bottom lg:hidden" aria-label="Navegação principal">
      <div className="flex h-16 items-stretch justify-around">
        {items.map(({ to, label, icon: Icon, match, badgeKey }) => {
          const active = match(pathname);
          const badge = badgeKey === "recebimentos" ? pendingRecebimentos : 0;
          return (
            <PrefetchLink
              key={to}
              to={to}
              aria-current={active ? "page" : undefined}
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
            </PrefetchLink>
          );
        })}
      </div>
    </nav>
  );
}
