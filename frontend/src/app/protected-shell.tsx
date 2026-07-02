import { useRecebimentosCounts } from "@/features/recebimentos/hooks";
import { AppShell } from "@/design-system/organisms";

export function ProtectedShell({ children }: { children: React.ReactNode }) {
  const { data } = useRecebimentosCounts();
  return <AppShell pendingRecebimentos={data?.pendentes ?? 0}>{children}</AppShell>;
}
