import { motion } from "framer-motion";
import { ChevronRight, CreditCard, Building2, Plug, Users, UserRound, FileText, Landmark } from "lucide-react";
import { Navigate } from "react-router-dom";
import { PageHeader } from "@/design-system/molecules";
import { PrefetchLink } from "@/design-system/molecules";
import { Typography } from "@/design-system/atoms";
import { useAuth } from "@/features/auth/context";
import { isTenantOwner } from "@/features/auth/types";
import { ROUTES } from "@/lib/constants";
import { configuracoesCopy } from "@/shared/copy/pt-BR";
import { useOrgModules } from "@/features/org/use-org-modules";

const settingsLinks = [
  {
    to: ROUTES.configuracoesEmpresa,
    title: configuracoesCopy.empresa.title,
    description: configuracoesCopy.empresa.description,
    icon: Building2,
    featured: true,
  },
  {
    to: ROUTES.configuracoesBanco,
    title: configuracoesCopy.banco.title,
    description: configuracoesCopy.banco.description,
    icon: Landmark,
    featured: true,
  },
  {
    to: ROUTES.plano,
    title: configuracoesCopy.plano.title,
    description: configuracoesCopy.plano.description,
    icon: CreditCard,
  },
  {
    to: ROUTES.perfil,
    title: configuracoesCopy.perfil.title,
    description: configuracoesCopy.perfil.description,
    icon: UserRound,
  },
  {
    to: ROUTES.equipe,
    title: configuracoesCopy.equipe.title,
    description: configuracoesCopy.equipe.description,
    icon: Users,
  },
  {
    to: ROUTES.tomadores,
    title: configuracoesCopy.tomadores.title,
    description: configuracoesCopy.tomadores.description,
    icon: UserRound,
  },
  {
    to: ROUTES.emissaoNf,
    title: configuracoesCopy.emissao.title,
    description: configuracoesCopy.emissao.description,
    icon: FileText,
    module: "fiscal_emissao" as const,
  },
  {
    to: ROUTES.integracoes,
    title: configuracoesCopy.integracoes.title,
    description: configuracoesCopy.integracoes.description,
    icon: Plug,
    module: "integrations_honest" as const,
  },
];

export default function ConfiguracoesPage() {
  const { user } = useAuth();
  const { hasModule } = useOrgModules();

  if (!isTenantOwner(user)) {
    return <Navigate to={ROUTES.home} replace />;
  }

  const links = settingsLinks.filter((link) => !link.module || hasModule(link.module));

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mx-auto max-w-3xl space-y-6">
      <PageHeader title={configuracoesCopy.pageTitle} description={configuracoesCopy.pageDescription} />

      <div className="grid gap-3">
        {links.map(({ to, title, description, icon: Icon, featured }) => (
          <PrefetchLink
            key={to}
            to={to}
            className={`group flex items-center gap-4 rounded-xl border p-5 transition-default hover:border-primary/30 hover:bg-surface ${
              featured ? "border-primary/20 bg-primary-subtle/20" : "border-border bg-surface/60"
            }`}
          >
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Icon className="h-5 w-5" aria-hidden />
            </span>
            <span className="min-w-0 flex-1">
              <Typography variant="subtitle">{title}</Typography>
              <Typography variant="caption" tone="muted" className="mt-1 block">
                {description}
              </Typography>
            </span>
            <ChevronRight
              className="h-5 w-5 shrink-0 text-muted-foreground transition-default group-hover:text-primary"
              aria-hidden
            />
          </PrefetchLink>
        ))}
      </div>
    </motion.div>
  );
}
