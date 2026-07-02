import { useNavigate } from "react-router-dom";
import { useCallback, useEffect, useState } from "react";
import { useRecebimentosQuery } from "../hooks";
import { itemKey } from "../api";
import type { LancamentoConciliacaoItem } from "../types";
import { ConciliationTemplate } from "@/design-system/templates";
import { SplitView, Sheet } from "@/design-system/organisms";
import { Button, Typography } from "@/design-system/atoms";
import { EmptyState, TaskGuide, NextStepBanner, SegmentedTabs } from "@/design-system/molecules";
import { ROUTES } from "@/lib/constants";
import { journeyNextSteps, screenTasks } from "@/lib/screen-tasks";
import { ConciliationQueue } from "../components/conciliation-queue";
import { MovimentoPanel } from "../components/movimento-panel";
import { RecebimentosOnboarding } from "../components/recebimentos-onboarding";
import { useRecebimentosOnboarding } from "../hooks/use-recebimentos-onboarding";
import { ChevronRight } from "lucide-react";

export default function RecebimentosPage({ variant }: { variant: "pendente" | "sem_match" }) {
  const navigate = useNavigate();
  const { data, isLoading, isError, refetch } = useRecebimentosQuery(variant);
  const [activeIndex, setActiveIndex] = useState(0);
  const [mobileSheetOpen, setMobileSheetOpen] = useState(false);
  const task = screenTasks.recebimentos;
  const onboarding = useRecebimentosOnboarding();

  useEffect(() => {
    setActiveIndex(0);
  }, [variant]);

  useEffect(() => {
    if (!data?.length) return;
    setActiveIndex((i) => Math.min(i, data.length - 1));
  }, [data?.length]);

  const current = data?.[activeIndex];
  const remaining = data?.length ?? 0;
  const activeKey = current ? itemKey(current) : null;

  const selectIndex = useCallback((index: number) => {
    setActiveIndex(index);
    if (window.innerWidth < 1024) setMobileSheetOpen(true);
  }, []);

  const openNext = useCallback(() => {
    if (!data?.length) return;
    setActiveIndex((i) => Math.min(i + 1, data.length - 1));
    setMobileSheetOpen(true);
  }, [data?.length]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!data?.length || e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.key === "ArrowDown" || e.key === "j") {
        e.preventDefault();
        setActiveIndex((i) => {
          const next = Math.min(i + 1, data.length - 1);
          if (window.innerWidth < 1024) setMobileSheetOpen(true);
          return next;
        });
      }
      if (e.key === "ArrowUp" || e.key === "k") {
        e.preventDefault();
        setActiveIndex((i) => {
          const next = Math.max(i - 1, 0);
          if (window.innerWidth < 1024) setMobileSheetOpen(true);
          return next;
        });
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [data?.length]);

  return (
    <ConciliationTemplate
      title="Confirmar recebimentos"
      description="Associe cada pagamento bancário à nota fiscal correspondente"
      loading={isLoading}
      error={isError ? "Não foi possível carregar os pagamentos." : undefined}
      onRetry={() => refetch()}
      taskGuide={<TaskGuide goal={task.goal} steps={task.steps} minutes={task.minutes} currentStep={1} />}
      tabs={
        <SegmentedTabs
          value={variant === "pendente" ? "pendentes" : "sem"}
          onChange={(id) => navigate(id === "pendentes" ? ROUTES.recebimentos : ROUTES.recebimentosSem)}
          options={[
            { id: "pendentes", label: "Precisa da sua confirmação" },
            { id: "sem", label: "Pagamentos sem nota" },
          ]}
        />
      }
    >
      {data && data.length === 0 && (
        <div className="stack-gap">
          <EmptyState
            title={variant === "pendente" ? "Nada pendente" : "Nenhum pagamento sem nota"}
            description="Todos os recebimentos estão associados às notas por enquanto."
          />
          <NextStepBanner {...journeyNextSteps.afterConciliacao} />
        </div>
      )}

      {data && data.length > 0 && (
        <>
          {onboarding.visible && variant === "pendente" && (
            <div className="mb-4">
              <RecebimentosOnboarding onDismiss={onboarding.dismiss} />
            </div>
          )}

          <Typography variant="caption" className="mb-3 block" tone="muted">
            <strong>{remaining}</strong> pagamento(s) · ↑↓ ou <kbd className="rounded border px-1">j</kbd>{" "}
            <kbd className="rounded border px-1">k</kbd> para navegar
          </Typography>

          <div className="hidden lg:block">
            <SplitView
              sidebar={<ConciliationQueue items={data} activeKey={activeKey} onSelect={selectIndex} />}
              main={current ? <MovimentoPanel key={activeKey} item={current} /> : null}
            />
          </div>

          <div className="lg:hidden">
            <ConciliationQueue items={data} activeKey={activeKey} onSelect={selectIndex} />
            {current && (
              <Sheet
                open={mobileSheetOpen}
                onOpenChange={setMobileSheetOpen}
                title={formatMovementTitle(current)}
                description="Escolha a nota e confirme"
              >
                <MovimentoPanel item={current} />
              </Sheet>
            )}
            {!mobileSheetOpen && current && (
              <Typography variant="caption" tone="muted" className="mt-3 block text-center">
                Toque em um pagamento na lista para ver os detalhes
              </Typography>
            )}
            {current && activeIndex < data.length - 1 && (
              <Button
                className="fixed bottom-20 right-4 z-30 h-12 gap-2 rounded-full px-5 shadow-lg lg:hidden"
                onClick={openNext}
                aria-label="Próximo pagamento pendente"
              >
                Próximo
                <ChevronRight className="h-4 w-4" aria-hidden />
              </Button>
            )}
          </div>
        </>
      )}
    </ConciliationTemplate>
  );
}

function formatMovementTitle(item: LancamentoConciliacaoItem) {
  return item.lancamento.pagador_nome || item.lancamento.descricao || "Pagamento bancário";
}
