import { useLocation } from "react-router-dom";
import { PrefetchLink, SkipToContent, ThemeToggle } from "@/design-system/molecules";
import { LogOut, Search, Settings } from "lucide-react";
import { Button, Typography, Badge, BrandLogo } from "@/design-system/atoms";
import { ROUTES } from "@/lib/constants";
import { useAuth } from "@/features/auth/context";
import { isTenantOwner } from "@/features/auth/types";
import { useOrgSlug } from "@/features/org/org-slug-context";
import { MobileNav } from "./mobile-nav";
import { buildSidebarNav, SidebarNav, SidebarUserFooter } from "./sidebar-nav";

export function AppShell({
  children,
  pendingRecebimentos = 0,
  onOpenCommandPalette,
}: {
  children: React.ReactNode;
  pendingRecebimentos?: number;
  onOpenCommandPalette?: () => void;
}) {
  const { pathname } = useLocation();
  const { user, logout } = useAuth();
  const orgSlug = useOrgSlug();
  const sidebarNav = buildSidebarNav(isTenantOwner(user));

  return (
    <div className="min-h-screen bg-background">
      <SkipToContent />
      <div className="lg:flex">
        <aside className="hidden w-60 shrink-0 flex-col border-r border-border bg-surface lg:fixed lg:inset-y-0 lg:z-40 lg:flex">
          <div className="flex h-14 shrink-0 items-center border-b border-border px-4">
            <BrandLogo size="md" />
          </div>
          <SidebarNav
            pathname={pathname}
            orgSlug={orgSlug}
            pendingRecebimentos={pendingRecebimentos}
            nav={sidebarNav}
          />
          <SidebarUserFooter name={user?.name} email={user?.email} onLogout={() => logout()} />
        </aside>

        <div className="flex min-h-screen flex-1 flex-col lg:pl-60">
          <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-border bg-surface/95 px-4 backdrop-blur lg:px-6">
            <BrandLogo size="sm" className="lg:hidden" />
            <Typography variant="small" tone="muted" className="hidden lg:flex lg:items-center lg:gap-3">
              <span>
                Olá, <span className="font-medium text-foreground">{user?.name?.split(" ")[0]}</span>
              </span>
              {pendingRecebimentos > 0 && (
                <PrefetchLink
                  to={ROUTES.recebimentos}
                  className="inline-flex items-center gap-1.5 rounded-full border border-danger/30 bg-danger-subtle px-2.5 py-1 text-small font-medium text-danger transition-default hover:bg-danger/10"
                >
                  <Badge variant="danger" className="tabular-nums">
                    {pendingRecebimentos > 99 ? "99+" : pendingRecebimentos}
                  </Badge>
                  aguardam confirmação
                </PrefetchLink>
              )}
            </Typography>
            <div className="flex items-center gap-2">
              {isTenantOwner(user) && (
                <PrefetchLink
                  to={ROUTES.configuracoes}
                  className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground transition-default hover:bg-muted hover:text-foreground lg:hidden"
                  aria-label="Configurações"
                >
                  <Settings className="h-4 w-4" aria-hidden />
                </PrefetchLink>
              )}
              {onOpenCommandPalette && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="hidden sm:inline-flex"
                  onClick={onOpenCommandPalette}
                  aria-label="Abrir busca de telas"
                >
                  <Search className="h-4 w-4 shrink-0" aria-hidden />
                  <span className="hidden md:inline">Buscar</span>
                  <kbd className="ml-1 hidden rounded border px-1 text-caption text-muted-foreground lg:inline">⌘K</kbd>
                </Button>
              )}
              <ThemeToggle />
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
      <MobileNav pendingRecebimentos={pendingRecebimentos} isOwner={isTenantOwner(user)} />
    </div>
  );
}
