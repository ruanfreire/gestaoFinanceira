import { motion } from "framer-motion";
import { ChevronRight, CreditCard, Users } from "lucide-react";
import { Navigate } from "react-router-dom";
import { PageHeader } from "@/design-system/molecules";
import { PrefetchLink } from "@/design-system/molecules";
import { Typography } from "@/design-system/atoms";
import { useAuth } from "@/features/auth/context";
import { isTenantOwner } from "@/features/auth/types";
import { ROUTES } from "@/lib/constants";

const settingsLinks = [
  {
    to: ROUTES.plano,
    title: "Plano e assinatura",
    description: "Gerencie trial, limites de uso e pagamento",
    icon: CreditCard,
  },
  {
    to: ROUTES.equipe,
    title: "Equipe",
    description: "Convide operadores e gerencie membros da organização",
    icon: Users,
  },
];

export default function ConfiguracoesPage() {
  const { user } = useAuth();

  if (!isTenantOwner(user)) {
    return <Navigate to={ROUTES.home} replace />;
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mx-auto max-w-3xl space-y-6">
      <PageHeader
        title="Configurações"
        description="Plano, assinatura e gestão da equipe da sua organização"
      />

      <div className="grid gap-3">
        {settingsLinks.map(({ to, title, description, icon: Icon }) => (
          <PrefetchLink
            key={to}
            to={to}
            className="group flex items-center gap-4 rounded-xl border border-border bg-surface/60 p-5 transition-default hover:border-primary/30 hover:bg-surface"
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
