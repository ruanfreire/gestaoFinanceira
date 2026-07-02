import { useEffect, useState } from "react";
import { useRecebimentosCounts } from "@/features/recebimentos/hooks";
import { AppShell, CommandPalette, useCommandPaletteShortcut } from "@/design-system/organisms";
import { OPEN_COMMAND_PALETTE_EVENT } from "@/lib/command-palette-events";
import { BillingBanner } from "@/features/billing/components/billing-banner";

export function ProtectedShell({ children }: { children: React.ReactNode }) {
  const { data } = useRecebimentosCounts();
  const [paletteOpen, setPaletteOpen] = useState(false);
  useCommandPaletteShortcut(() => setPaletteOpen(true));

  useEffect(() => {
    const onOpen = () => setPaletteOpen(true);
    window.addEventListener(OPEN_COMMAND_PALETTE_EVENT, onOpen);
    return () => window.removeEventListener(OPEN_COMMAND_PALETTE_EVENT, onOpen);
  }, []);

  return (
    <>
      <AppShell
        pendingRecebimentos={data?.pendentes ?? 0}
        onOpenCommandPalette={() => setPaletteOpen(true)}
      >
        <BillingBanner />
        {children}
      </AppShell>
      <CommandPalette open={paletteOpen} onOpenChange={setPaletteOpen} />
    </>
  );
}
