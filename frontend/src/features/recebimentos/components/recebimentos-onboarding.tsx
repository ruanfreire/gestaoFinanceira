import { Button, Typography } from "@/design-system/atoms";
import { Callout } from "@/design-system/molecules";

export function RecebimentosOnboarding({ onDismiss }: { onDismiss: () => void }) {
  return (
    <Callout variant="info" title="Como funciona">
      <Typography variant="caption" className="block">
        1. Escolha um pagamento na fila · 2. Confira a nota sugerida · 3. Toque em Confirmar recebimento
      </Typography>
      <Typography variant="caption" tone="muted" className="mt-2 block">
        No computador: use <kbd className="rounded border px-1">j</kbd> e <kbd className="rounded border px-1">k</kbd>{" "}
        para navegar. Enter abre a confirmação. Você pode desfazer por alguns segundos após confirmar.
      </Typography>
      <Button size="sm" variant="outline" className="mt-3" onClick={onDismiss}>
        Entendi
      </Button>
    </Callout>
  );
}
