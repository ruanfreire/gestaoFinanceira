import { PrefetchLink } from "@/design-system/molecules";
import { Button, Typography, Avatar, Badge } from "@/design-system/atoms";
import { cn } from "@/design-system/lib/cn";
import { ROUTES } from "@/lib/constants";
import { stripOrgSlug } from "@/lib/org-path";
import type { ClientNav } from "@/apps/client/nav/build-client-nav";
import type { ProductNavItem } from "@/apps/client/nav/product-nav.config";
import type { LucideIcon } from "lucide-react";
import { LogOut } from "lucide-react";

export type { ClientNav };
export { buildClientNav } from "@/apps/client/nav/build-client-nav";

/** @deprecated Use buildClientNav */
export { buildClientNav as buildSidebarNav } from "@/apps/client/nav/build-client-nav";

export function SidebarNav({
  pathname,
  orgSlug,
  pendingRecebimentos,
  nav,
}: {
  pathname: string;
  orgSlug?: string;
  pendingRecebimentos: number;
  nav: ClientNav;
}) {
  return (
    <nav className="sidebar-scroll flex-1 space-y-1 overflow-y-auto px-3 py-4" aria-label="Menu lateral">
      <ul className="space-y-0.5" role="list">
        {nav.primary.map((item) => (
          <SidebarLink
            key={item.id}
            to={item.to}
            label={item.label}
            icon={item.icon}
            pathname={pathname}
            orgSlug={orgSlug}
            badge={item.badgeKey === "recebimentos" ? pendingRecebimentos : undefined}
            matchPrefix={item.to === ROUTES.home ? "exact-home" : "default"}
          />
        ))}
      </ul>

      {nav.sections.map((section) => (
        <SidebarSection key={section.id} label={section.label}>
          {section.items.map((item) => (
            <SidebarLink
              key={item.id}
              to={item.to}
              label={item.label}
              pathname={pathname}
              orgSlug={orgSlug}
              nested
              badge={item.badgeKey === "recebimentos" ? pendingRecebimentos : undefined}
            />
          ))}
        </SidebarSection>
      ))}
    </nav>
  );
}

function SidebarSection({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <section className="mt-5 border-t border-border-subtle pt-4 first:mt-4">
      <Typography
        variant="overline"
        tone="muted"
        as="h2"
        className="mb-1.5 px-3 text-[0.6875rem] font-semibold tracking-[0.08em]"
      >
        {label}
      </Typography>
      <ul className="space-y-0.5" role="list">
        {children}
      </ul>
    </section>
  );
}

function isNavActive(path: string, to: string, matchPrefix: "exact-home" | "default") {
  if (matchPrefix === "exact-home") {
    return path === ROUTES.home;
  }
  if (to === ROUTES.configuracoes) {
    return path.startsWith("/configuracoes");
  }
  if (to === ROUTES.documentos) {
    return path.startsWith("/documentos");
  }
  if (to === ROUTES.operacoesConfirmar) {
    return path.startsWith("/operacoes");
  }
  return path === to || path.startsWith(`${to}/`);
}

function SidebarLink({
  to,
  label,
  icon: Icon,
  pathname,
  orgSlug,
  nested,
  badge,
  matchPrefix = "default",
}: {
  to: string;
  label: string;
  icon?: LucideIcon;
  pathname: string;
  orgSlug?: string;
  nested?: boolean;
  badge?: number;
  matchPrefix?: "exact-home" | "default";
}) {
  const path = stripOrgSlug(pathname, orgSlug);
  const active = isNavActive(path, to, matchPrefix);

  return (
    <li>
      <PrefetchLink
        to={to}
        aria-current={active ? "page" : undefined}
        className={cn(
          "group relative flex min-h-9 items-center gap-2.5 rounded-md py-2 transition-default",
          nested ? "pl-3 pr-3 text-small" : "px-3 text-body",
          active
            ? "bg-primary/10 font-medium text-primary"
            : "font-normal text-muted-foreground hover:bg-muted/60 hover:text-foreground",
        )}
      >
        {active && (
          <span
            className="absolute bottom-1.5 left-0 top-1.5 w-0.5 rounded-full bg-primary"
            aria-hidden
          />
        )}
        {Icon && (
          <Icon
            className={cn(
              "h-4 w-4 shrink-0",
              active ? "text-primary" : "text-muted-foreground group-hover:text-foreground",
            )}
            aria-hidden
          />
        )}
        <span className="min-w-0 flex-1 truncate leading-snug">{label}</span>
        {badge != null && badge > 0 && (
          <Badge variant="danger" className="ml-auto shrink-0 tabular-nums" aria-label={`${badge} pendente(s)`}>
            {badge > 99 ? "99+" : badge}
          </Badge>
        )}
      </PrefetchLink>
    </li>
  );
}

export function SidebarUserFooter({
  name,
  email,
  onLogout,
}: {
  name?: string;
  email?: string;
  onLogout: () => void;
}) {
  return (
    <div className="border-t border-border p-3">
      <div className="rounded-lg bg-surface-sunken p-2.5">
        <div className="flex items-center gap-3 px-1 py-1">
          <Avatar name={name} size="sm" />
          <div className="min-w-0 flex-1">
            <Typography variant="small" className="truncate font-medium text-foreground">
              {name}
            </Typography>
            <Typography variant="caption" tone="muted" className="truncate">
              {email}
            </Typography>
          </div>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="mt-2 w-full justify-start text-muted-foreground hover:text-foreground"
          icon={LogOut}
          onClick={onLogout}
        >
          Sair
        </Button>
      </div>
    </div>
  );
}
