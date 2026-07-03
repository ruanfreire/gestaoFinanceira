import {
  Home,
  FileText,
  Link2,
  LogOut,
  Settings,
  type LucideIcon,
} from "lucide-react";
import { PrefetchLink } from "@/design-system/molecules";
import { Button, Typography, Avatar, Badge } from "@/design-system/atoms";
import { cn } from "@/design-system/lib/cn";
import { ROUTES } from "@/lib/constants";
import { stripOrgSlug } from "@/lib/org-path";

export type SidebarNavItem = {
  to: string;
  label: string;
  icon: LucideIcon;
  badgeKey?: "recebimentos";
};

export type SidebarNavSection = {
  label: string;
  items: Array<{ to: string; label: string }>;
};

export function buildSidebarNav(isOwner: boolean): {
  primary: SidebarNavItem[];
  sections: SidebarNavSection[];
} {
  const sections: SidebarNavSection[] = [
    {
      label: "Trazer dados",
      items: [
        { to: ROUTES.arquivosNotas, label: "Enviar notas" },
        { to: ROUTES.arquivosExtratos, label: "Enviar extrato bancário" },
        { to: ROUTES.arquivosHistorico, label: "Histórico" },
      ],
    },
    {
      label: "Análises",
      items: [
        { to: ROUTES.analisesSituacao, label: "Situação das notas" },
        { to: ROUTES.analisesFluxo, label: "Fluxo de caixa" },
      ],
    },
  ];

  const primary: SidebarNavItem[] = [
    { to: ROUTES.home, label: "Início", icon: Home },
    { to: ROUTES.notas, label: "Minhas notas", icon: FileText },
    { to: ROUTES.recebimentos, label: "Confirmar recebimentos", icon: Link2, badgeKey: "recebimentos" },
  ];

  if (isOwner) {
    primary.push({ to: ROUTES.configuracoes, label: "Configurações", icon: Settings });
  }

  return { primary, sections };
}

export function SidebarNav({
  pathname,
  orgSlug,
  pendingRecebimentos,
  nav,
}: {
  pathname: string;
  orgSlug?: string;
  pendingRecebimentos: number;
  nav: ReturnType<typeof buildSidebarNav>;
}) {
  return (
    <nav className="sidebar-scroll flex-1 space-y-1 overflow-y-auto px-3 py-4" aria-label="Menu lateral">
      <ul className="space-y-0.5" role="list">
        {nav.primary.map((item) => (
          <SidebarLink
            key={item.to}
            to={item.to}
            label={item.label}
            icon={item.icon}
            pathname={pathname}
            orgSlug={orgSlug}
            badge={item.badgeKey === "recebimentos" ? pendingRecebimentos : undefined}
          />
        ))}
      </ul>

      {nav.sections.map((section) => (
        <SidebarSection key={section.label} label={section.label}>
          {section.items.map((item) => (
            <SidebarLink
              key={item.to}
              to={item.to}
              label={item.label}
              pathname={pathname}
              orgSlug={orgSlug}
              nested
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

function SidebarLink({
  to,
  label,
  icon: Icon,
  pathname,
  orgSlug,
  nested,
  badge,
}: {
  to: string;
  label: string;
  icon?: LucideIcon;
  pathname: string;
  orgSlug?: string;
  nested?: boolean;
  badge?: number;
}) {
  const path = stripOrgSlug(pathname, orgSlug);
  const active =
    path === to ||
    (to === ROUTES.configuracoes && path.startsWith("/configuracoes")) ||
    (to !== ROUTES.home && to !== ROUTES.configuracoes && path.startsWith(to));

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
