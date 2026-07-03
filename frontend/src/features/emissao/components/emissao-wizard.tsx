import { useEffect, useState } from "react";
import { Modal } from "@/design-system/organisms";
import { Button, Input, Label, Typography } from "@/design-system/atoms";
import { Callout } from "@/design-system/molecules";
import { useToast } from "@/app/toast-provider";
import { getApiErrorMessage } from "@/lib/api-client";
import { formatMoney } from "@/lib/format";
import {
  useAtualizarEmissaoRascunhoMutation,
  useConfirmarEmissaoMutation,
  useCriarEmissaoRascunhoMutation,
} from "../hooks";
import type { TomadorSugerido } from "@/features/recebimentos/types";
import type { EmissaoRascunho } from "../types";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  lancamentoId: string;
  valor?: number;
  tomadorSugerido?: TomadorSugerido;
  onSuccess?: () => void;
};

export function EmissaoWizard({
  open,
  onOpenChange,
  lancamentoId,
  valor,
  tomadorSugerido,
  onSuccess,
}: Props) {
  const { toast } = useToast();
  const criar = useCriarEmissaoRascunhoMutation();
  const atualizar = useAtualizarEmissaoRascunhoMutation();
  const confirmar = useConfirmarEmissaoMutation();
  const [rascunho, setRascunho] = useState<EmissaoRascunho | null>(null);
  const [codigoServico, setCodigoServico] = useState("");
  const [discriminacao, setDiscriminacao] = useState("");
  const [valorNota, setValorNota] = useState("");

  useEffect(() => {
    if (!open) {
      setRascunho(null);
      setCodigoServico("");
      setDiscriminacao("");
      setValorNota("");
      return;
    }

    let cancelled = false;
    (async () => {
      try {
        const created = await criar.mutateAsync({
          lancamento_id: lancamentoId,
          tomador_id: tomadorSugerido?.id,
        });
        if (cancelled) return;
        setRascunho(created);
        setCodigoServico(created.payload.codigo_servico ?? "");
        setDiscriminacao(created.payload.discriminacao ?? "");
        setValorNota(String(created.payload.valor ?? valor ?? ""));
      } catch (error) {
        if (!cancelled) {
          toast(getApiErrorMessage(error, "Não foi possível iniciar a emissão"), "error");
          onOpenChange(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, lancamentoId, tomadorSugerido?.id]);

  const handleConfirm = async () => {
    if (!rascunho) return;
    try {
      await atualizar.mutateAsync({
        id: rascunho._id,
        payload: {
          valor: Number.parseFloat(valorNota.replace(",", ".")),
          codigo_servico: codigoServico.trim(),
          discriminacao: discriminacao.trim(),
        },
      });
      const result = await confirmar.mutateAsync(rascunho._id);
      toast(
        result.emissao_honest
          ? `NF ${result.numero} emitida e pagamento vinculado`
          : `Nota ${result.numero} registrada e pagamento vinculado`,
        "success",
      );
      onOpenChange(false);
      onSuccess?.();
    } catch (error) {
      toast(getApiErrorMessage(error, "Não foi possível confirmar a emissão"), "error");
    }
  };

  const busy = criar.isPending || atualizar.isPending || confirmar.isPending;
  const tomadorNome = rascunho?.tomador?.nome ?? tomadorSugerido?.nome;

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title="Registrar nota para este recebimento"
      description="Revise os dados fiscais. O pagamento será vinculado automaticamente após confirmar."
    >
      {criar.isPending && !rascunho ? (
        <Typography variant="body" tone="muted">
          Preparando rascunho...
        </Typography>
      ) : (
        <div className="space-y-4">
          {tomadorNome ? (
            <Callout variant="info" title="Tomador">
              <Typography variant="body">{tomadorNome}</Typography>
              {rascunho?.tomador?.documento ? (
                <Typography variant="caption" tone="muted" className="mt-1 block">
                  Documento: {rascunho.tomador.documento}
                </Typography>
              ) : null}
            </Callout>
          ) : null}

          <div className="space-y-2">
            <Label htmlFor="emissao-valor">Valor (R$)</Label>
            <Input
              id="emissao-valor"
              value={valorNota}
              onChange={(event) => setValorNota(event.target.value)}
              placeholder={valor != null ? formatMoney(valor) : "0,00"}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="emissao-servico">Código de serviço</Label>
            <Input
              id="emissao-servico"
              value={codigoServico}
              onChange={(event) => setCodigoServico(event.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="emissao-discriminacao">Discriminação</Label>
            <Input
              id="emissao-discriminacao"
              value={discriminacao}
              onChange={(event) => setDiscriminacao(event.target.value)}
            />
          </div>

          <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={busy}>
              Cancelar
            </Button>
            <Button type="button" onClick={handleConfirm} loading={busy} disabled={!rascunho}>
              Confirmar e vincular
            </Button>
          </div>
        </div>
      )}
    </Modal>
  );
}
