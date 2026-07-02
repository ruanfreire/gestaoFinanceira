import { Badge } from "@/design-system/atoms";
import type { PlanId } from "@/features/billing/api";

const PLAN_LABELS: Record<PlanId, string> = {
  trial: "Trial",
  starter: "Starter",
  pro: "Pro",
};

export function PlanBadge({ plan }: { plan?: PlanId }) {
  if (!plan) return null;
  const variant = plan === "pro" ? "info" : plan === "starter" ? "success" : "neutral";
  return <Badge variant={variant}>{PLAN_LABELS[plan]}</Badge>;
}

export { PLAN_LABELS };
