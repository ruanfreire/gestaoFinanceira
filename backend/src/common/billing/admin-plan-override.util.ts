import type { BillingStatus, PlanId } from './plans.config';

const TRIAL_DAYS = 14;

export type AdminPlanOverride = {
  plan: PlanId;
  billingStatus: BillingStatus;
  trialEndsAt?: Date;
  planActivatedAt?: Date;
};

export function buildAdminPlanOverride(plan: PlanId, now = new Date()): AdminPlanOverride {
  if (plan === 'trial') {
    const trialEndsAt = new Date(now);
    trialEndsAt.setDate(trialEndsAt.getDate() + TRIAL_DAYS);
    return {
      plan: 'trial',
      billingStatus: 'trialing',
      trialEndsAt,
    };
  }

  return {
    plan,
    billingStatus: 'active',
    planActivatedAt: now,
  };
}
