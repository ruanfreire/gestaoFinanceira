import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Plus } from "lucide-react";
import { useNotasQuery, useDesvincularMutation } from "../hooks";
import { ListTemplate } from "@/design-system/templates";
import { ConfirmDialog, DataTable, Modal, SplitView } from "@/design-system/organisms";
import type { DataTableColumn } from "@/design-system/organisms";
import { Button, Typography } from "@/design-system/atoms";
import { Badge } from "@/design-system/atoms";
import { SearchInput, TaskGuide } from "@/design-system/molecules";
import { Pagination } from "@/design-system/molecules";
import { ROUTES, PAYMENT_STATUS_LABELS } from "@/lib/constants";
import { formatDate, formatMoney } from "@/lib/format";
import type { Nota } from "../types";
import { useToast } from "@/app/toast-provider";
import { screenTasks } from "@/lib/screen-tasks";
import { NotaDetailPanel } from "../components/nota-detail-panel";
import { NotasQueue } from "../components/notas-queue";

const columns: DataTableColumn<Nota>[] = [
  { id: "numero", header: "NF", cell: (n) => n.numero ?? "—", sortable: true, sortValue: (n) => n.numero ?? "" },
  { id: "empresa", header: "Empresa", cell: (n) => n.empresa ?? "—", sortable: true, sortValue: (n) => n.empresa ?? "" },
  { id: "tomador", header: "Tomador", cell: (n) => n.tomador ?? "—", sortable: true, sortValue: (n) => n.tomador ?? "" },
  { id: "valor", header: "Valor", cell: (n) => formatMoney(n.valor), sortable: true, sortValue: (n) => n.valor ?? 0 },
  {
    id: "status",
    header: "Status",
    cell: (n) => (
      <Badge variant={n.status_pagamento === "pago" ? "success" : "warning"}>
        {PAYMENT_STATUS_LABELS[n.status_pagamento ?? ""] ?? n.status_pagamento}
      </Badge>
    ),
  },
];

type PendingUndo = {
  notaId: string;
  lancamentoId: string;
  source: "asaas" | "nubank";
};

export default function NotasPage() {
  const { data, isLoading, isError, page, setPage, search, setSearch, refetch } = useNotasQuery();
  const [selected, setSelected] = useState<Nota | null>(null);
  const [mobileDetailOpen, setMobileDetailOpen] = useState(false);
  const [pendingUndo, setPendingUndo] = useState<PendingUndo | null>(null);
  const desvincular = useDesvincularMutation();
  const { toast } = useToast();
  const totalPages = data ? Math.ceil(data.total / data.limit) : 1;
  const task = screenTasks.notas;
  const items = data?.items ?? [];

  useEffect(() => {
    const list = data?.items ?? [];
    if (!list.length) {
      setSelected(null);
      return;
    }
    setSelected((current) => {
      if (current && list.some((n) => n._id === current._id)) return current;
      return list[0];
    });
  }, [data?.items, page]);

  const undoLink = async () => {
    if (!pendingUndo) return;
    try {
      await desvincular.mutateAsync({
        nota_id: pendingUndo.notaId,
        lancamento_id: pendingUndo.lancamentoId,
        source: pendingUndo.source,
      });
      toast("Vínculo desfeito", "success");
      setPendingUndo(null);
    } catch {
      toast("Não foi possível desfazer o vínculo", "error");
    }
  };

  return (
    <ListTemplate
      title="Minhas notas"
      description="Consulte e gerencie suas notas fiscais"
      taskGuide={<TaskGuide goal={task.goal} steps={task.steps} minutes={task.minutes} />}
      loading={isLoading}
      error={isError ? "Não foi possível carregar as notas." : undefined}
      onRetry={() => refetch()}
      actions={
        <Button asChild>
          <Link to={ROUTES.notaNova}>
            <Plus className="h-4 w-4 shrink-0" aria-hidden />
            Registrar nota
          </Link>
        </Button>
      }
    >
      {/* Desktop: split view */}
      <div className="hidden lg:block">
        <SearchInput
          value={search}
          onChange={(q) => {
            setSearch(q);
            setPage(1);
          }}
          placeholder="Buscar por número, tomador..."
          className="mb-4"
        />
        {items.length === 0 && !isLoading ? (
          <Typography variant="body" tone="muted">
            Nenhuma nota ainda. Envie suas notas ou registre uma manualmente.
          </Typography>
        ) : (
          <SplitView
            sidebar={
              <div className="flex h-full flex-col">
                <NotasQueue items={items} activeId={selected?._id ?? null} onSelect={setSelected} />
                {totalPages > 1 && (
                  <div className="border-t border-border p-3">
                    <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
                  </div>
                )}
              </div>
            }
            main={
              selected ? (
                <NotaDetailPanel
                  key={selected._id}
                  nota={selected}
                  onDesvincular={(payload) => setPendingUndo(payload)}
                />
              ) : null
            }
          />
        )}
      </div>

      {/* Mobile: tabela em cards + modal */}
      <div className="lg:hidden">
        <DataTable
          columns={columns}
          data={items}
          search={search}
          onSearchChange={(q) => {
            setSearch(q);
            setPage(1);
          }}
          searchPlaceholder="Buscar por número, tomador..."
          page={page}
          totalPages={totalPages}
          onPageChange={setPage}
          onRowClick={(n) => {
            setSelected(n);
            setMobileDetailOpen(true);
          }}
          emptyTitle="Nenhuma nota encontrada"
          emptyDescription="Envie suas notas ou registre uma manualmente."
          mobileCard={(n) => (
            <div>
              <Typography variant="subtitle">
                NF {n.numero} · {n.empresa}
              </Typography>
              <Typography variant="caption">{formatDate(n.data_emissao)}</Typography>
              <Typography variant="subtitle" className="mt-2">
                {formatMoney(n.valor)}
              </Typography>
            </div>
          )}
        />
      </div>

      <Modal
        open={mobileDetailOpen && Boolean(selected)}
        onOpenChange={(open) => {
          setMobileDetailOpen(open);
          if (!open) setSelected(null);
        }}
        title={selected ? `NF ${selected.numero}` : ""}
        description={selected?.empresa}
        footer={
          <Button variant="outline" onClick={() => setMobileDetailOpen(false)}>
            Fechar
          </Button>
        }
      >
        {selected && (
          <NotaDetailPanel nota={selected} onDesvincular={(payload) => setPendingUndo(payload)} />
        )}
      </Modal>

      <ConfirmDialog
        open={Boolean(pendingUndo)}
        onOpenChange={(open) => !open && setPendingUndo(null)}
        title="Desfazer vínculo?"
        description="O pagamento voltará a ficar pendente de confirmação."
        confirmLabel="Desfazer"
        variant="danger"
        loading={desvincular.isPending}
        onConfirm={undoLink}
      />
    </ListTemplate>
  );
}
