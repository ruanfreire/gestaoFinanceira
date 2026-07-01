import { Fragment } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
} from "@ui/components/ui/table";
import Skeleton from "@ui/components/ui/skeleton/Skeleton";
import EmptyState from "@ui/components/ui/empty-state/EmptyState";
import Pagination from "@ui/components/ui/pagination/Pagination";
import {
  formatCompetencia,
  formatCurrency,
  formatDate,
  pagamentosResumo,
} from "@/utils/nota-format.util";
import type { Nota } from "../types/nota.types";
import { NotaPagamentosDetalhe } from "./NotaPagamentosDetalhe";
import { NotaPaymentStatusBadge } from "./NotaPaymentStatusBadge";

type NotasTableProps = {
  notas: Nota[];
  loading?: boolean;
  expandedId: string | null;
  onTogglePagamentos: (id: string) => void;
  page: number;
  totalPages: number;
  totalItems: number;
  onPageChange: (page: number) => void;
  searchTerm?: string;
  onImportClick?: () => void;
};

const COLUMN_COUNT = 12;

export function NotasTable({
  notas,
  loading = false,
  expandedId,
  onTogglePagamentos,
  page,
  totalPages,
  totalItems,
  onPageChange,
  searchTerm,
  onImportClick,
}: NotasTableProps) {
  return (
    <div>
      <div className="overflow-x-auto rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
        <Table>
          <TableHeader>
            <TableRow>
              <TableCell isHeader>ID</TableCell>
              <TableCell isHeader>Número</TableCell>
              <TableCell isHeader>Tomador</TableCell>
              <TableCell isHeader>Competência</TableCell>
              <TableCell isHeader>Cód. serviço</TableCell>
              <TableCell isHeader>Valor</TableCell>
              <TableCell isHeader>Emissão</TableCell>
              <TableCell isHeader>Pagamento</TableCell>
              <TableCell isHeader>Pagamentos</TableCell>
              <TableCell isHeader>Status NF</TableCell>
              <TableCell isHeader>RPS</TableCell>
              <TableCell isHeader>Prefeitura</TableCell>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading &&
              Array.from({ length: 6 }).map((_, rowIndex) => (
                <TableRow key={`sk-${rowIndex}`}>
                  {Array.from({ length: COLUMN_COUNT }).map((__, colIndex) => (
                    <TableCell key={colIndex}>
                      <Skeleton className="h-4 w-full" />
                    </TableCell>
                  ))}
                </TableRow>
              ))}

            {!loading && notas.length === 0 && (
              <tr>
                <td colSpan={COLUMN_COUNT} className="p-0">
                  <EmptyState
                    title={searchTerm ? "Nenhuma nota encontrada" : "Nenhuma nota cadastrada"}
                    description={
                      searchTerm
                        ? "Tente outro termo de busca."
                        : "Cadastre manualmente ou importe via JSON."
                    }
                    actionLabel={!searchTerm && onImportClick ? "Importar notas" : undefined}
                    onAction={onImportClick}
                    className="border-0 bg-transparent"
                  />
                </td>
              </tr>
            )}

            {!loading &&
              notas.map((nota) => {
                const hasPagamentos = (nota.pagamentos?.length ?? 0) > 0;
                const isExpanded = expandedId === nota._id;

                return (
                  <Fragment key={nota._id}>
                    <TableRow>
                      <TableCell className="whitespace-nowrap">{nota.nota_api_id || "—"}</TableCell>
                      <TableCell className="whitespace-nowrap">{nota.numero || "—"}</TableCell>
                      <TableCell>{nota.tomador || "—"}</TableCell>
                      <TableCell className="whitespace-nowrap">
                        {formatCompetencia(nota.mes_competencia)}
                      </TableCell>
                      <TableCell className="whitespace-nowrap">{nota.codigo_servico || "—"}</TableCell>
                      <TableCell className="whitespace-nowrap">{formatCurrency(nota.valor)}</TableCell>
                      <TableCell className="whitespace-nowrap">{formatDate(nota.data_emissao)}</TableCell>
                      <TableCell className="whitespace-nowrap">
                        <NotaPaymentStatusBadge
                          status={nota.status_pagamento}
                          valor={nota.valor}
                          valorPago={nota.valor_pago}
                        />
                        {(nota.status_pagamento === "pago" || nota.status_pagamento === "parcial") &&
                          nota.data_pagamento && (
                            <span className="mt-1 block text-xs text-gray-400">
                              {formatDate(nota.data_pagamento)}
                            </span>
                          )}
                      </TableCell>
                      <TableCell className="max-w-xs">
                        {hasPagamentos ? (
                          <div>
                            <p className="text-xs text-gray-600 dark:text-gray-400">
                              {pagamentosResumo(nota.pagamentos)}
                            </p>
                            <button
                              type="button"
                              onClick={() => onTogglePagamentos(nota._id)}
                              className="mt-1 text-xs text-brand-500 hover:underline"
                            >
                              {isExpanded ? "Ocultar detalhes" : "Ver detalhes"}
                            </button>
                          </div>
                        ) : (
                          "—"
                        )}
                      </TableCell>
                      <TableCell className="whitespace-nowrap">{nota.status || "—"}</TableCell>
                      <TableCell className="whitespace-nowrap">{nota.rps_id || "—"}</TableCell>
                      <TableCell>
                        {nota.link_prefeitura ? (
                          <a
                            href={nota.link_prefeitura}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-brand-500 hover:underline"
                          >
                            Ver NF
                          </a>
                        ) : (
                          "—"
                        )}
                      </TableCell>
                    </TableRow>
                    {isExpanded && hasPagamentos && (
                      <TableRow>
                        <td colSpan={COLUMN_COUNT} className="p-0">
                          <NotaPagamentosDetalhe notaId={nota._id} pagamentos={nota.pagamentos!} />
                        </td>
                      </TableRow>
                    )}
                  </Fragment>
                );
              })}
          </TableBody>
        </Table>
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
