import Skeleton from "@ui/components/ui/skeleton/Skeleton";
import Pagination from "@ui/components/ui/pagination/Pagination";
import EmptyState from "@ui/components/ui/empty-state/EmptyState";
import { formatCompetencia, formatCurrency, formatDate } from "@/utils/nota-format.util";
import type {
  AsaasLancamento,
  BancoExtrato,
  LancamentoExtrato,
  NubankLancamento,
} from "../types/importacao-extrato.types";
import { statusConciliacaoLabel, tipoMovimentoLabel } from "../utils/importacao-extrato-display.util";

function isAsaas(item: LancamentoExtrato): item is AsaasLancamento {
  return item.banco === "asaas";
}

function notaVinculadaLabel(nota?: { numero?: string; mes_competencia?: string } | null) {
  if (!nota) return "—";
  return `NF ${nota.numero} · ${formatCompetencia(nota.mes_competencia)}`;
}

type LancamentosExtratoTableProps = {
  banco: BancoExtrato;
  items: LancamentoExtrato[];
  loading?: boolean;
  page: number;
  totalPages: number;
  totalItems: number;
  onPageChange: (page: number) => void;
};

export function LancamentosExtratoTable({
  banco,
  items,
  loading,
  page,
  totalPages,
  totalItems,
  onPageChange,
}: LancamentosExtratoTableProps) {
  if (loading) {
    return (
      <div className="space-y-2 rounded-2xl border border-gray-200 p-4 dark:border-gray-800">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-8 w-full" />
        ))}
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <EmptyState
        title="Nenhum lançamento encontrado"
        description="Ajuste os filtros ou importe um novo extrato."
      />
    );
  }

  return (
    <div>
      <div className="overflow-x-auto rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
        {banco === "asaas" ? (
          <table className="min-w-full text-sm">
            <thead className="border-b border-gray-200 bg-gray-50 dark:border-gray-800">
              <tr>
                <th className="px-3 py-2 text-left font-medium">Data</th>
                <th className="px-3 py-2 text-left font-medium">Tipo</th>
                <th className="px-3 py-2 text-left font-medium">Transação ID</th>
                <th className="px-3 py-2 text-left font-medium">Tipo transação</th>
                <th className="px-3 py-2 text-left font-medium">Estornada</th>
                <th className="min-w-[200px] px-3 py-2 text-left font-medium">Descrição</th>
                <th className="px-3 py-2 text-right font-medium">Valor</th>
                <th className="px-3 py-2 text-right font-medium">Saldo</th>
                <th className="px-3 py-2 text-left font-medium">Fatura parc.</th>
                <th className="px-3 py-2 text-left font-medium">Fatura cobr.</th>
                <th className="px-3 py-2 text-left font-medium">NF ref</th>
                <th className="px-3 py-2 text-left font-medium">Wallet</th>
                <th className="px-3 py-2 text-left font-medium">Tipo lanç.</th>
                <th className="px-3 py-2 text-left font-medium">Pagador</th>
                <th className="px-3 py-2 text-left font-medium">Status</th>
                <th className="px-3 py-2 text-left font-medium">NF vinculada</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => {
                if (!isAsaas(item)) return null;
                return (
                  <tr key={item._id} className="border-b border-gray-100 dark:border-gray-800">
                    <td className="whitespace-nowrap px-3 py-2">{formatDate(item.data)}</td>
                    <td className="px-3 py-2">{tipoMovimentoLabel(item.tipo_movimento)}</td>
                    <td className="px-3 py-2 font-mono text-xs">{item.transacao_id || "—"}</td>
                    <td className="px-3 py-2">{item.tipo_transacao || "—"}</td>
                    <td className="px-3 py-2">{item.transacao_estornada ? "Sim" : "Não"}</td>
                    <td className="max-w-xs truncate px-3 py-2" title={item.descricao}>
                      {item.descricao || "—"}
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums">{formatCurrency(item.valor)}</td>
                    <td className="px-3 py-2 text-right tabular-nums">
                      {item.saldo != null ? formatCurrency(item.saldo) : "—"}
                    </td>
                    <td className="px-3 py-2 font-mono text-xs">{item.fatura_parcelamento_id || "—"}</td>
                    <td className="px-3 py-2 font-mono text-xs">{item.fatura_cobranca_id || "—"}</td>
                    <td className="px-3 py-2">{item.nota_fiscal_ref || "—"}</td>
                    <td className="px-3 py-2">{item.wallet || "—"}</td>
                    <td className="px-3 py-2">{item.tipo_lancamento || "—"}</td>
                    <td className="px-3 py-2">{item.pagador_nome || "—"}</td>
                    <td className="px-3 py-2">{statusConciliacaoLabel(item.status_conciliacao)}</td>
                    <td className="px-3 py-2">{notaVinculadaLabel(item.nota)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        ) : (
          <table className="min-w-full text-sm">
            <thead className="border-b border-gray-200 bg-gray-50 dark:border-gray-800">
              <tr>
                <th className="px-3 py-2 text-left font-medium">Data</th>
                <th className="px-3 py-2 text-left font-medium">Tipo</th>
                <th className="px-3 py-2 text-left font-medium">Identificador</th>
                <th className="min-w-[240px] px-3 py-2 text-left font-medium">Descrição</th>
                <th className="px-3 py-2 text-right font-medium">Valor</th>
                <th className="px-3 py-2 text-left font-medium">Categoria</th>
                <th className="px-3 py-2 text-left font-medium">Origem</th>
                <th className="px-3 py-2 text-left font-medium">Créd/Déb</th>
                <th className="px-3 py-2 text-left font-medium">Pagador</th>
                <th className="px-3 py-2 text-left font-medium">Status</th>
                <th className="px-3 py-2 text-left font-medium">NF vinculada</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => {
                const nubank = item as NubankLancamento;
                return (
                  <tr key={item._id} className="border-b border-gray-100 dark:border-gray-800">
                    <td className="whitespace-nowrap px-3 py-2">{formatDate(item.data)}</td>
                    <td className="px-3 py-2">{tipoMovimentoLabel(item.tipo_movimento)}</td>
                    <td className="px-3 py-2 font-mono text-xs">{item.transacao_id || "—"}</td>
                    <td className="max-w-md truncate px-3 py-2" title={item.descricao}>
                      {item.descricao || "—"}
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums">{formatCurrency(item.valor)}</td>
                    <td className="px-3 py-2">{nubank.categoria || "—"}</td>
                    <td className="px-3 py-2">{nubank.origem || "—"}</td>
                    <td className="px-3 py-2">{nubank.tipo || "—"}</td>
                    <td className="px-3 py-2">{item.pagador_nome || "—"}</td>
                    <td className="px-3 py-2">{statusConciliacaoLabel(item.status_conciliacao)}</td>
                    <td className="px-3 py-2">{notaVinculadaLabel(item.nota)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {totalPages > 1 && (
        <div className="mt-4">
          <Pagination
            page={page}
            totalPages={totalPages}
            totalItems={totalItems}
            onPageChange={onPageChange}
            disabled={loading}
          />
        </div>
      )}
    </div>
  );
}
