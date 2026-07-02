import { useEffect, useState } from "react";
import { useVincularMutation } from "../hooks";
import { useConciliacaoUndo } from "../hooks/use-conciliacao-undo";
import { recebimentosApi, matchExplanation } from "../api";
import type { LancamentoConciliacaoItem, NotaCandidata } from "../types";
import { ConfirmDialog } from "@/design-system/organisms";
import { Button, Input, Typography, Badge } from "@/design-system/atoms";
import { Callout, MatchScore } from "@/design-system/molecules";
import { formatDate, formatMoney, bancoLabel } from "@/lib/format";
import { useToast } from "@/app/toast-provider";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { cn } from "@/design-system/lib/cn";

export function MovimentoPanel({ item }: { item: LancamentoConciliacaoItem }) {
  const vincular = useVincularMutation();
  const { showSuccessWithUndo } = useConciliacaoUndo();
  const { toast } = useToast();
  const [notaId, setNotaId] = useState("");
  const [search, setSearch] = useState("");
  const [candidatas, setCandidatas] = useState<NotaCandidata[]>(item.candidatas);
  const [pagador, setPagador] = useState(item.lancamento.pagador_nome ?? "");
  const [confirmOpen, setConfirmOpen] = useState(false);
  const debouncedSearch = useDebouncedValue(search, 300);

  const selected = candidatas.find((c) => c._id === notaId) ?? candidatas[0];
  const needsPagador = item.source === "nubank" && !item.lancamento.pagador_nome;
  const canConfirm = !needsPagador && Boolean(selected);

  useEffect(() => {
    setCandidatas(item.candidatas);
    setNotaId(item.candidatas[0]?._id ?? "");
    setPagador(item.lancamento.pagador_nome ?? "");
    setSearch("");
  }, [item]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const list = await recebimentosApi.listCandidatas(
        item.source,
        item.lancamento._id,
        debouncedSearch || undefined,
      );
      if (!cancelled) {
        setCandidatas(list);
        setNotaId((current) => {
          if (list.some((c) => c._id === current)) return current;
          return list[0]?._id ?? "";
        });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [debouncedSearch, item.lancamento._id, item.source]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Enter" || confirmOpen) return;
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement || e.target instanceof HTMLSelectElement) {
        return;
      }
      if (!canConfirm || vincular.isPending) return;
      e.preventDefault();
      setConfirmOpen(true);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [canConfirm, confirmOpen, vincular.isPending]);

  const confirm = async () => {
    const id = notaId || candidatas[0]?._id;
    if (!id) {
      toast("Nenhuma nota disponível para vincular", "error");
      return;
    }
    try {
      await vincular.mutateAsync({
        source: item.source,
        lancamentoId: item.lancamento._id,
        notaId: id,
      });
      showSuccessWithUndo(id, item.lancamento._id, item.source);
    } catch (err) {
      toast(recebimentosApi.getErrorMessage(err, "Não foi possível confirmar"), "error");
    }
  };

  const savePagador = async () => {
    try {
      const res = await recebimentosApi.updatePagadorNubank(item.lancamento._id, pagador);
      setCandidatas(res.candidatas);
      if (res.candidatas[0]) setNotaId(res.candidatas[0]._id);
      toast("Pagador atualizado", "success");
    } catch (err) {
      toast(recebimentosApi.getErrorMessage(err, "Não foi possível atualizar o pagador"), "error");
    }
  };

  return (
    <div className="stack-gap p-4 lg:p-6">
      <header className="stack-gap">
        <Typography variant="overline" tone="muted">
          Qual nota corresponde a este pagamento?
        </Typography>
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="outline">{bancoLabel(item.source)}</Badge>
          <Typography variant="h2" className="tabular-nums">
            {formatMoney(item.lancamento.valor)}
          </Typography>
        </div>
        <Typography variant="caption">{formatDate(item.lancamento.data)}</Typography>
        <Typography variant="body">
          {item.lancamento.pagador_nome || item.lancamento.descricao || "—"}
        </Typography>
      </header>

      {needsPagador && (
        <Callout variant="warning" title="Quem fez este pagamento?">
          <Typography variant="caption">Este Pix não tem nome. Informe o pagador para buscar notas.</Typography>
          <div className="mt-2 flex flex-col gap-2 sm:flex-row">
            <Input value={pagador} onChange={(e) => setPagador(e.target.value)} placeholder="Nome do pagador" />
            <Button type="button" variant="outline" onClick={savePagador}>
              Buscar notas
            </Button>
          </div>
        </Callout>
      )}

      {!needsPagador && (
        <div className="stack-gap">
          <div className="flex items-center justify-between gap-2">
            <Typography variant="subtitle">Notas candidatas</Typography>
            <Typography variant="caption" tone="muted">
              {candidatas.length} encontrada(s)
            </Typography>
          </div>

          <Input
            placeholder="Buscar por número ou tomador..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            aria-label="Buscar nota candidata"
          />

          {candidatas.length === 0 ? (
            <Typography variant="body" tone="muted">
              Nenhuma nota encontrada. Tente outro termo de busca.
            </Typography>
          ) : (
            <ul className="stack-gap" role="radiogroup" aria-label="Selecionar nota">
              {candidatas.map((c) => {
                const active = c._id === (notaId || candidatas[0]?._id);
                return (
                  <li key={c._id}>
                    <button
                      type="button"
                      role="radio"
                      aria-checked={active}
                      onClick={() => setNotaId(c._id)}
                      className={cn(
                        "w-full rounded-xl border p-4 text-left transition-default",
                        active ? "border-primary bg-primary-subtle ring-1 ring-primary" : "border-border hover:border-primary/50",
                      )}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <Typography variant="subtitle">NF {c.numero}</Typography>
                          <Typography variant="caption" className="block truncate">
                            {c.tomador}
                          </Typography>
                          <Typography variant="body" className="mt-1 tabular-nums">
                            {formatMoney(c.valor)}
                          </Typography>
                          {c.match && (
                            <Typography variant="caption" tone="muted" className="mt-1 block">
                              {matchExplanation(c.match)}
                            </Typography>
                          )}
                        </div>
                        {c.match && (
                          <MatchScore score={c.match.totalScore} label="Compatibilidade" className="w-24 shrink-0" />
                        )}
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}

      <div className="sticky bottom-0 border-t border-border bg-surface pt-4 lg:static lg:border-0 lg:pt-0">
        <Button
          size="lg"
          className="w-full"
          onClick={() => setConfirmOpen(true)}
          loading={vincular.isPending}
          disabled={!canConfirm}
        >
          Confirmar recebimento
        </Button>
        <Typography variant="caption" tone="muted" className="mt-2 block text-center">
          Enter para confirmar · desfazer disponível por alguns segundos após confirmar
        </Typography>
      </div>

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="Confirmar recebimento?"
        description={
          selected
            ? `Vincular o pagamento de ${formatMoney(item.lancamento.valor)} à NF ${selected.numero} (${selected.tomador}).`
            : undefined
        }
        confirmLabel="Confirmar"
        loading={vincular.isPending}
        onConfirm={async () => {
          await confirm();
          setConfirmOpen(false);
        }}
      />
    </div>
  );
}
