import { useCallback, useEffect, useState } from "react";
import Input from "@ui/components/form/input/InputField";
import Button from "@ui/components/ui/button/Button";
import Badge from "@ui/components/ui/badge/Badge";
import Alert from "@ui/components/ui/alert/Alert";
import { useToast } from "@ui/components/ui/toast/ToastContext";
import {
  competenciaOffsetLabel,
  formatCompetencia,
  formatCurrency,
  formatDate,
} from "@/utils/nota-format.util";
import { conciliacaoService } from "../services/conciliacao.service";
import { useVincularConciliacaoMutation } from "../hooks/useConciliacaoMutations";
import { useConciliacaoKeyboard } from "../hooks/useConciliacaoKeyboard";
import { ConfidenceBar, matchConfidenceScore } from "./ConfidenceBar";
import type {
  ConciliacaoVariant,
  LancamentoConciliacaoItem,
  NotaCandidata,
} from "../types/conciliacao.types";

function formatDaysDiff(daysDiff: number | null | undefined) {
  if (daysDiff == null) return "—";
  if (daysDiff === 0) return "Mesmo dia";
  return daysDiff > 0 ? `${daysDiff} dia(s) depois` : `${Math.abs(daysDiff)} dia(s) antes`;
}

function competenciaLabel(nota: NotaCandidata) {
  const mes = nota.mes_competencia || nota.match?.mesCompetencia;
  return formatCompetencia(mes);
}

type ConciliacaoLancamentoCardProps = {
  item: LancamentoConciliacaoItem;
  onLinked: () => void;
  variant?: ConciliacaoVariant;
};

export function ConciliacaoLancamentoCard({
  item,
  onLinked,
  variant = "pendente",
}: ConciliacaoLancamentoCardProps) {
  const toast = useToast();
  const vincularMutation = useVincularConciliacaoMutation();

  const { lancamento, source } = item;
  const [candidatas, setCandidatas] = useState<NotaCandidata[]>(item.candidatas);
  const [lancamentoInfo, setLancamentoInfo] = useState(lancamento);
  const [selectedNotaId, setSelectedNotaId] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [pagadorInput, setPagadorInput] = useState(lancamento.pagador_nome || "");
  const [loadingNotas, setLoadingNotas] = useState(false);
  const [updatingPagador, setUpdatingPagador] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const semNomePix = source === "nubank" && !lancamentoInfo.pagador_nome?.trim();

  useEffect(() => {
    setCandidatas(item.candidatas);
    setLancamentoInfo(item.lancamento);
    setPagadorInput(item.lancamento.pagador_nome || "");
    setSelectedNotaId("");
    setError(null);
  }, [item]);

  const loadNotas = useCallback(
    async (query?: string) => {
      setLoadingNotas(true);
      setError(null);
      try {
        const list = await conciliacaoService.listNotasCandidatas(
          source,
          lancamentoInfo._id,
          query,
        );
        setCandidatas(list);
        setSelectedNotaId("");
      } catch (err) {
        setError(conciliacaoService.getErrorMessage(err, "Não foi possível carregar as notas"));
      } finally {
        setLoadingNotas(false);
      }
    },
    [lancamentoInfo._id, source],
  );

  const handleAtualizarPagador = async (event: React.FormEvent) => {
    event.preventDefault();
    if (source !== "nubank") return;
    setUpdatingPagador(true);
    setError(null);
    try {
      const res = await conciliacaoService.updatePagadorNubank(
        lancamentoInfo._id,
        pagadorInput,
      );
      setLancamentoInfo(res.lancamento);
      setCandidatas(res.candidatas);
      setSelectedNotaId("");
    } catch (err) {
      setError(conciliacaoService.getErrorMessage(err, "Não foi possível atualizar o pagador"));
    } finally {
      setUpdatingPagador(false);
    }
  };

  const handleSearch = (event: React.FormEvent) => {
    event.preventDefault();
    loadNotas(searchInput.trim() || undefined);
  };

  const handleVincular = async () => {
    if (!selectedNotaId) return;
    setError(null);
    try {
      await vincularMutation.mutateAsync({
        source,
        lancamentoId: lancamentoInfo._id,
        notaId: selectedNotaId,
      });
      toast.showToast({ variant: "success", title: "Pagamento vinculado à nota." });
      onLinked();
    } catch (err) {
      const msg = conciliacaoService.getErrorMessage(err, "Falha ao vincular pagamento");
      setError(msg);
      toast.showToast({ variant: "error", title: msg });
    }
  };

  useConciliacaoKeyboard({
    enabled: Boolean(selectedNotaId) && !vincularMutation.isPending,
    onConfirm: () => {
      void handleVincular();
    },
  });

  const emptyHint =
    variant === "sem_match"
      ? semNomePix
        ? "Nenhuma NF com o mesmo valor e data próxima. Busque por tomador, número ou valor."
        : "Nenhuma sugestão automática. Busque por tomador, número ou valor."
      : semNomePix
        ? "Pix sem nome — sugestões por valor e data. Use o filtro ou informe o pagador abaixo."
        : "Nenhuma nota em aberto encontrada para este pagador.";

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900">
      <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="font-semibold text-gray-800 dark:text-white/90">
              {lancamentoInfo.pagador_nome || "Pagador não identificado"}
            </h2>
            <Badge color={source === "asaas" ? "info" : "primary"} size="sm">
              {source === "asaas" ? "Asaas" : "Nubank"}
            </Badge>
            {variant === "sem_match" && (
              <Badge color="error" size="sm">
                Sem correspondência
              </Badge>
            )}
            {semNomePix && (
              <Badge color="warning" size="sm">
                Pix sem nome
              </Badge>
            )}
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400">{lancamentoInfo.descricao}</p>
        </div>
        <div className="text-right text-sm">
          <p className="font-medium text-gray-800 dark:text-white/90">
            {formatCurrency(lancamentoInfo.valor)}
          </p>
          <p className="text-gray-500">Pagamento: {formatDate(lancamentoInfo.data)}</p>
          {lancamentoInfo.fatura_cobranca_id && (
            <p className="text-xs text-gray-400">Fatura Asaas {lancamentoInfo.fatura_cobranca_id}</p>
          )}
        </div>
      </div>

      {semNomePix && (
        <form
          onSubmit={handleAtualizarPagador}
          className="mb-4 flex flex-col gap-2 rounded-xl border border-orange-200 bg-orange-50 p-4 dark:border-orange-900/30 dark:bg-orange-900/10"
        >
          <p className="text-sm text-orange-800 dark:text-orange-300">
            O extrato Nubank não trouxe o nome do pagador. Informe o tomador para refinar as
            sugestões.
          </p>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <div className="flex-1">
              <Input
                type="text"
                value={pagadorInput}
                onChange={(e) => setPagadorInput(e.target.value)}
                placeholder="Nome do pagador / tomador"
              />
            </div>
            <Button type="submit" disabled={updatingPagador}>
              {updatingPagador ? "Atualizando..." : "Atualizar sugestões"}
            </Button>
          </div>
        </form>
      )}

      <form onSubmit={handleSearch} className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center">
        <div className="flex-1">
          <Input
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder={
              semNomePix
                ? "Buscar NF por tomador, número ou valor..."
                : "Filtrar notas por número, tomador ou valor..."
            }
          />
        </div>
        <Button type="submit" variant="outline" disabled={loadingNotas}>
          {loadingNotas ? "Buscando..." : "Filtrar notas"}
        </Button>
      </form>

      {error && (
        <div className="mb-4">
          <Alert variant="error" title="Erro" message={error} />
        </div>
      )}

      {loadingNotas ? (
        <p className="text-sm text-gray-500">Carregando notas...</p>
      ) : candidatas.length === 0 ? (
        <p className="text-sm text-gray-500">{emptyHint}</p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-800">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50 dark:bg-gray-900">
              <tr>
                <th className="w-10 px-4 py-3 text-left font-medium text-gray-600 dark:text-gray-400" />
                <th className="px-4 py-3 text-left font-medium text-gray-600 dark:text-gray-400">
                  Número
                </th>
                <th className="px-4 py-3 text-left font-medium text-gray-600 dark:text-gray-400">
                  Tomador
                </th>
                <th className="px-4 py-3 text-left font-medium text-gray-600 dark:text-gray-400">
                  Competência
                </th>
                <th className="px-4 py-3 text-left font-medium text-gray-600 dark:text-gray-400">
                  Valor NF
                </th>
                <th className="px-4 py-3 text-left font-medium text-gray-600 dark:text-gray-400">
                  Emissão
                </th>
                <th className="px-4 py-3 text-left font-medium text-gray-600 dark:text-gray-400">
                  Proximidade
                </th>
              </tr>
            </thead>
            <tbody>
              {candidatas.map((nota) => {
                const isSelected = selectedNotaId === nota._id;
                const isBest =
                  candidatas[0]?._id === nota._id &&
                  (nota.match?.valueMatch ||
                    nota.match?.partialMatch ||
                    nota.match?.dateClose ||
                    nota.match?.competenciaMatch);
                const competenciaHint = competenciaOffsetLabel(nota.match?.competenciaOffset);

                return (
                  <tr
                    key={nota._id}
                    onClick={() => setSelectedNotaId(nota._id)}
                    className={`cursor-pointer border-t border-gray-200 transition-colors dark:border-gray-800 ${
                      isSelected
                        ? "bg-brand-50 dark:bg-brand-500/10"
                        : "hover:bg-gray-50 dark:hover:bg-gray-900/50"
                    }`}
                  >
                    <td className="px-4 py-3">
                      <input
                        type="radio"
                        name={`nota-${lancamentoInfo._id}`}
                        checked={isSelected}
                        onChange={() => setSelectedNotaId(nota._id)}
                        className="accent-brand-500"
                      />
                    </td>
                    <td className="px-4 py-3 font-medium">{nota.numero || "—"}</td>
                    <td className="px-4 py-3">{nota.tomador || "—"}</td>
                    <td className="whitespace-nowrap px-4 py-3">
                      <span>{competenciaLabel(nota)}</span>
                      {nota.match?.competenciaMatch && competenciaHint && (
                        <span className="mt-1 inline-block">
                          <Badge color="success" size="sm">
                            {competenciaHint}
                          </Badge>
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span>{formatCurrency(nota.valor)}</span>
                      {nota.valor_pago != null && nota.valor_pago > 0 && (
                        <span className="mt-1 block text-xs text-gray-500">
                          Já pago: {formatCurrency(nota.valor_pago)} · Saldo:{" "}
                          {formatCurrency((nota.valor ?? 0) - nota.valor_pago)}
                        </span>
                      )}
                      {nota.match?.valueMatch && (
                        <span className="ml-2 inline-flex">
                          <Badge color="success" size="sm">
                            Valor igual
                          </Badge>
                        </span>
                      )}
                      {nota.match?.partialMatch && (
                        <span className="ml-2 inline-flex">
                          <Badge color="primary" size="sm">
                            Pagamento parcial
                          </Badge>
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">{formatDate(nota.data_emissao)}</td>
                    <td className="px-4 py-3">
                      <span className="block">{formatDaysDiff(nota.match?.daysDiff)}</span>
                      {nota.match?.dateClose && (
                        <span className="mt-1 inline-block">
                          <Badge color="info" size="sm">
                            Data próxima
                          </Badge>
                        </span>
                      )}
                      {isBest && (
                        <span className="mt-1 ml-1 inline-block">
                          <Badge color="primary" size="sm">
                            Melhor match
                          </Badge>
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        {selectedNotaId && (
          <div className="w-full max-w-xs">
            <ConfidenceBar
              score={matchConfidenceScore(candidatas.find((n) => n._id === selectedNotaId) ?? {})}
            />
          </div>
        )}
        <div className="flex flex-col items-end gap-1 sm:ml-auto">
          <p className="text-xs text-gray-400">Ctrl+Enter para confirmar · j/k navegar lista</p>
          <Button
            onClick={handleVincular}
            disabled={!selectedNotaId || vincularMutation.isPending}
            loading={vincularMutation.isPending}
          >
            Confirmar vínculo da nota selecionada
          </Button>
        </div>
      </div>
    </div>
  );
}
