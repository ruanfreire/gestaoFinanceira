import { describe, expect, it } from 'vitest';
import { computeBillingAccess } from './organization-billing.util';

describe('computeBillingAccess', () => {
  const now = new Date('2026-07-01T12:00:00.000Z');

  it('allows active subscriptions', () => {
    expect(computeBillingAccess({ billingStatus: 'active', plan: 'pro' }, now)).toEqual({
      allowed: true,
    });
  });

  it('allows trialing org before trial end', () => {
    const access = computeBillingAccess(
      {
        billingStatus: 'trialing',
        plan: 'trial',
        trialEndsAt: new Date('2026-07-10T00:00:00.000Z'),
      },
      now,
    );
    expect(access.allowed).toBe(true);
    expect(access.isTrialing).toBe(true);
    expect(access.trialDaysLeft).toBe(9);
  });

  it('blocks expired trial', () => {
    const access = computeBillingAccess(
      {
        billingStatus: 'trialing',
        plan: 'trial',
        trialEndsAt: new Date('2026-06-20T00:00:00.000Z'),
      },
      now,
    );
    expect(access).toEqual({ allowed: false, reason: 'trial_expired' });
  });

  it('allows past_due with flag', () => {
    expect(computeBillingAccess({ billingStatus: 'past_due', plan: 'starter' }, now)).toEqual({
      allowed: true,
      isPastDue: true,
    });
  });

  it('allows canceled until period end', () => {
    expect(
      computeBillingAccess(
        {
          billingStatus: 'canceled',
          plan: 'starter',
          currentPeriodEnd: new Date('2026-07-15T00:00:00.000Z'),
        },
        now,
      ),
    ).toEqual({ allowed: true });
  });
});
