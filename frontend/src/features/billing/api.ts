import api from "@/lib/api-client";

export type PlanId = "trial" | "starter" | "pro";

export type BillingStatus =
  | "trialing"
  | "active"
  | "past_due"
  | "canceled"
  | "unpaid"
  | "none";

export type PlanLimits = {
  maxNotas: number | null;
  maxImportsPerMonth: number | null;
};

export type BillingAccess = {
  allowed: boolean;
  reason?: "trial_expired" | "subscription_inactive" | "period_ended";
  trialDaysLeft?: number;
  isTrialing?: boolean;
  isPastDue?: boolean;
};

export type BillingUsage = {
  notas: number;
  importsThisMonth: number;
};

export type BillingPlanOption = {
  id: Exclude<PlanId, "trial">;
  name: string;
  description: string;
  priceLabel: string;
  limits: PlanLimits;
  available: boolean;
};

export type BillingStatusResponse = {
  ok: boolean;
  plan: PlanId;
  billingStatus: BillingStatus;
  trialEndsAt?: string;
  currentPeriodEnd?: string;
  limits: PlanLimits;
  usage: BillingUsage;
  access: BillingAccess;
  stripeConfigured: boolean;
  hasSubscription: boolean;
};

export const billingApi = {
  async getStatus() {
    const { data } = await api.get<BillingStatusResponse>("/billing/status");
    return data;
  },

  async listPlans() {
    const { data } = await api.get<{ items: BillingPlanOption[] }>("/billing/plans");
    return data.items;
  },

  async createCheckout(plan: Exclude<PlanId, "trial">) {
    const { data } = await api.post<{ ok: boolean; url?: string }>("/billing/checkout", { plan });
    return data;
  },

  async createPortal() {
    const { data } = await api.post<{ ok: boolean; url?: string }>("/billing/portal");
    return data;
  },
};
