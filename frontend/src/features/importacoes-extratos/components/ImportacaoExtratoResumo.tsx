import { Link } from "react-router-dom";
import Button from "@ui/components/ui/button/Button";
import ComponentCard from "@ui/components/common/ComponentCard";
import { formatCurrency } from "@/utils/nota-format.util";
import type { BancoExtrato, ImportacaoExtrato } from "../types/importacao-extrato.types";
import { bancoLabel, formatDateTime } from "../utils/importacao-extrato-display.util";

type ImportacaoExtratoResumoProps = {
  importacao: ImportacaoExtrato;
  banco: BancoExtrato;
  onDownloadCsv: () => void;
};

export function ImportacaoExtratoResumo({
  importacao,
  banco,
  onDownloadCsv,
}: ImportacaoExtratoResumoProps) {
  return (
    <ComponentCard
      title={`Resumo — ${bancoLabel(banco)}`}
      desc={importacao.periodo ? `Período: ${importacao.periodo}` : undefined}
      className="xl:col-span-2"
    >
      <dl className="grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-3">
        <div>
          <dt className="text-gray-500">Status</dt>
          <dd className="font-medium text-gray-800 dark:text-white/90">{importacao.status || "—"}</dd>
        </div>
        <div>
          <dt className="text-gray-500">Importado em</dt>
          <dd className="font-medium">{formatDateTime(importacao.createdAt)}</dd>
        </div>
        {banco === "asaas" && (
          <>
            <div>
              <dt className="text-gray-500">Saldo inicial</dt>
              <dd className="font-medium">{formatCurrency(importacao.saldo_inicial)}</dd>
            </div>
            <div>
              <dt className="text-gray-500">Saldo final</dt>
              <dd className="font-medium">{formatCurrency(importacao.saldo_final)}</dd>
            </div>
            <div>
              <dt className="text-gray-500">Cobranças</dt>
              <dd className="font-medium">{importacao.stats?.cobrancas ?? "—"}</dd>
            </div>
          </>
        )}
        {banco === "nubank" && (
          <>
            <div>
              <dt className="text-gray-500">Formato</dt>
              <dd className="font-medium">{importacao.formato || "—"}</dd>
            </div>
            <div>
              <dt className="text-gray-500">Créditos</dt>
              <dd className="font-medium">{importacao.stats?.creditos ?? "—"}</dd>
            </div>
          </>
        )}
        <div>
          <dt className="text-gray-500">Conciliados auto / manual</dt>
          <dd className="font-medium">
            {importacao.stats?.conciliado_auto ?? 0} / {importacao.stats?.conciliado_manual ?? 0}
          </dd>
        </div>
        <div>
          <dt className="text-gray-500">Entradas / Saídas</dt>
          <dd className="font-medium">
            {importacao.stats?.entradas ?? "—"} / {importacao.stats?.saidas ?? "—"}
          </dd>
        </div>
        <div>
          <dt className="text-gray-500">Pendentes / sem match / extrato</dt>
          <dd className="font-medium">
            {importacao.stats?.pendente_vinculo ?? 0} / {importacao.stats?.sem_match ?? 0} /{" "}
            {importacao.stats?.extrato ?? importacao.stats?.ignorado ?? 0}
          </dd>
        </div>
        <div>
          <dt className="text-gray-500">Linhas novas / já importadas</dt>
          <dd className="font-medium">
            {importacao.stats?.imported ?? "—"} / {importacao.stats?.skipped ?? "—"}
          </dd>
        </div>
      </dl>

      <div className="mt-4 flex flex-wrap gap-2">
        <Button variant="outline" onClick={onDownloadCsv}>
          Baixar CSV original
        </Button>
        <Link to="/conciliacao">
          <Button variant="outline">Conciliação</Button>
        </Link>
      </div>
    </ComponentCard>
  );
}
