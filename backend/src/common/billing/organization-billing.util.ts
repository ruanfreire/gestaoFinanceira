import type { BillingStatus, PlanId } from './plans.config';

export type OrganizationBillingSnapshot = {
  plan?: PlanId;
  billingStatus?: BillingStatus;
  trialEndsAt?: Date | string | null;
  currentPeriodEnd?: Date | string | null;
};

export type BillingAccess = {
  allowed: boolean;
  reason?: 'trial_expired' | 'subscription_inactive' | 'period_ended';
  trialDaysLeft?: number;
  isTrialing?: boolean;
  isPastDue?: boolean;
};

function toDate(value?: Date | string | null): Date | null {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function computeBillingAccess(org: OrganizationBillingSnapshot, now = new Date()): BillingAccess {
  const billingStatus = org.billingStatus ?? 'none';
  const trialEndsAt = toDate(org.trialEndsAt);
  const currentPeriodEnd = toDate(org.currentPeriodEnd);

  if (billingStatus === 'active') {
    return { allowed: true };
  }

  if (billingStatus === 'past_due') {
    return { allowed: true, isPastDue: true };
  }

  if (billingStatus === 'trialing' || billingStatus === 'none') {
    if (trialEndsAt && trialEndsAt.getTime() > now.getTime()) {
      const trialDaysLeft = Math.max(
        0,
        Math.ceil((trialEndsAt.getTime() - now.getTime()) / (24 * 60 * 60 * 1000)),
      );
      return { allowed: true, isTrialing: true, trialDaysLeft };
    }
    return { allowed: false, reason: 'trial_expired' };
  }

  if (billingStatus === 'canceled' || billingStatus === 'unpaid') {
    if (currentPeriodEnd && currentPeriodEnd.getTime() > now.getTime()) {
      return { allowed: true };
    }
    return { allowed: false, reason: 'period_ended' };
  }

  return { allowed: false, reason: 'subscription_inactive' };
}

export const BILLING_ACCESS_MESSAGES: Record<NonNullable<BillingAccess['reason']>, string> = {
  trial_expired: 'Seu período de teste terminou. Assine um plano para continuar.',
  subscription_inactive: 'Assinatura inativa. Regularize o pagamento para continuar.',
  period_ended: 'Sua assinatura expirou. Renove para continuar usando o sistema.',
};
