import { Badge } from "@/design-system/atoms";
import type { UserStatus } from "@/features/auth/types";

const LABELS: Record<UserStatus, string> = {
  pending: "Pendente",
  approved: "Aprovado",
  rejected: "Rejeitado",
  suspended: "Suspenso",
};

const VARIANTS: Record<UserStatus, "warning" | "success" | "danger" | "neutral"> = {
  pending: "warning",
  approved: "success",
  rejected: "danger",
  suspended: "neutral",
};

export function ClientStatusBadge({ status }: { status: UserStatus }) {
  return <Badge variant={VARIANTS[status]}>{LABELS[status]}</Badge>;
}
