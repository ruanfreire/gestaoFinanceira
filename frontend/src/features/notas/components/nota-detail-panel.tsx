import type { Nota } from "../types";
import { Badge, Button, Typography } from "@/design-system/atoms";
import { PAYMENT_STATUS_LABELS } from "@/lib/constants";
import { formatDate, formatMoney } from "@/lib/format";

export function NotaDetailPanel({
  nota,
  onDesvincular,
}: {
  nota: Nota;
  onDesvincular: (payload: { notaId: string; lancamentoId: string; source: "asaas" | "nubank" }) => void;
}) {
  return (
    <div className="stack-gap p-4 lg:p-6">
      <header className="stack-gap">
        <Typography variant="h2">NF {nota.numero}</Typography>
        <Typography variant="body" tone="muted">
          {nota.empresa}
        </Typography>
        <div className="flex flex-wrap items-center gap-2">
          <Typography variant="subtitle" className="tabular-nums">
            {formatMoney(nota.valor)}
          </Typography>
          <Badge variant={nota.status_pagamento === "pago" ? "success" : "warning"}>
            {PAYMENT_STATUS_LABELS[nota.status_pagamento ?? ""] ?? nota.status_pagamento}
          </Badge>
        </div>
        {nota.tomador && (
          <Typography variant="caption">Tomador: {nota.tomador}</Typography>
        )}
        {nota.data_emissao && (
          <Typography variant="caption">Emissão: {formatDate(nota.data_emissao)}</Typography>
        )}
      </header>

      <div className="stack-gap">
        <Typography variant="subtitle">Pagamentos vinculados</Typography>
        {nota.pagamentos?.length ? (
          nota.pagamentos.map((p, i) => (
            <div key={i} className="flex items-center justify-between gap-2 rounded-lg border border-border p-3">
              <div className="min-w-0">
                <Typography variant="small">{p.pagador_nome || p.descricao || "Pagamento"}</Typography>
                <Typography variant="caption">{formatDate(p.data)}</Typography>
              </div>
              {p.lancamento_id && p.source && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() =>
                    onDesvincular({
                      notaId: nota._id,
                      lancamentoId: p.lancamento_id!,
                      source: p.source!,
                    })
                  }
                >
                  Desfazer
                </Button>
              )}
            </div>
          ))
        ) : (
          <Typography variant="body" tone="muted">
            Nenhum pagamento vinculado a esta nota.
          </Typography>
        )}
      </div>
    </div>
  );
}
