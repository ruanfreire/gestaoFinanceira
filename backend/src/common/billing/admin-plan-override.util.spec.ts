import { describe, expect, it } from 'vitest';
import { buildAdminPlanOverride } from './admin-plan-override.util';

const now = new Date('2026-07-01T12:00:00.000Z');

describe('buildAdminPlanOverride', () => {
  it('configura trial com 14 dias', () => {
    const result = buildAdminPlanOverride('trial', now);
    expect(result).toEqual({
      plan: 'trial',
      billingStatus: 'trialing',
      trialEndsAt: new Date('2026-07-15T12:00:00.000Z'),
    });
  });

  it('configura planos pagos como ativos', () => {
    expect(buildAdminPlanOverride('starter', now)).toEqual({
      plan: 'starter',
      billingStatus: 'active',
      planActivatedAt: now,
    });
    expect(buildAdminPlanOverride('pro', now)).toEqual({
      plan: 'pro',
      billingStatus: 'active',
      planActivatedAt: now,
    });
  });
});
