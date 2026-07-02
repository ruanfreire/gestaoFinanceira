export type PlanId = 'trial' | 'starter' | 'pro';

export type BillingStatus =
  | 'trialing'
  | 'active'
  | 'past_due'
  | 'canceled'
  | 'unpaid'
  | 'none';

export type PlanLimits = {
  maxNotas: number | null;
  maxImportsPerMonth: number | null;
};

export type PlanDefinition = {
  id: PlanId;
  name: string;
  description: string;
  priceLabel: string;
  limits: PlanLimits;
  stripePriceEnvKey?: 'STRIPE_PRICE_STARTER_MONTHLY' | 'STRIPE_PRICE_PRO_MONTHLY';
};

export const PLAN_DEFINITIONS: Record<PlanId, PlanDefinition> = {
  trial: {
    id: 'trial',
    name: 'Trial',
    description: '14 dias para experimentar o sistema',
    priceLabel: 'Grátis',
    limits: { maxNotas: 500, maxImportsPerMonth: 20 },
  },
  starter: {
    id: 'starter',
    name: 'Starter',
    description: 'Para pequenas operações financeiras',
    priceLabel: 'Sob consulta',
    limits: { maxNotas: 2_000, maxImportsPerMonth: 100 },
    stripePriceEnvKey: 'STRIPE_PRICE_STARTER_MONTHLY',
  },
  pro: {
    id: 'pro',
    name: 'Pro',
    description: 'Volume alto de notas e importações',
    priceLabel: 'Sob consulta',
    limits: { maxNotas: null, maxImportsPerMonth: null },
    stripePriceEnvKey: 'STRIPE_PRICE_PRO_MONTHLY',
  },
};

export const BILLABLE_PLANS: PlanId[] = ['starter', 'pro'];

export function getPlanLimits(plan: PlanId): PlanLimits {
  return PLAN_DEFINITIONS[plan]?.limits ?? PLAN_DEFINITIONS.trial.limits;
}

export function resolveStripePriceId(plan: PlanId): string | null {
  const definition = PLAN_DEFINITIONS[plan];
  if (!definition?.stripePriceEnvKey) return null;
  return process.env[definition.stripePriceEnvKey]?.trim() || null;
}
