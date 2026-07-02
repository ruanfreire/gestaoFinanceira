import { Card, CardBody, CardHeader } from "@/design-system/organisms";
import { Typography } from "@/design-system/atoms";
import { formatMoney } from "@/lib/format";

type ChartData = {
  categories: string[];
  emitido: number[];
  recebido: number[];
};

function HorizontalBars({
  categories,
  emitido,
  recebido,
}: {
  categories: string[];
  emitido: number[];
  recebido: number[];
}) {
  const maxValue = Math.max(...emitido, ...recebido, 1);

  return (
    <div className="space-y-5">
      {categories.map((category, index) => {
        const e = emitido[index] ?? 0;
        const r = recebido[index] ?? 0;
        return (
          <div key={category} className="space-y-2">
            {categories.length > 1 && (
              <Typography variant="caption" tone="muted" className="font-medium">
                {category}
              </Typography>
            )}
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <span className="w-16 shrink-0 text-caption text-muted-foreground">Emitido</span>
                <div className="h-2 min-w-0 flex-1 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-primary/80 transition-default"
                    style={{ width: `${Math.max((e / maxValue) * 100, e > 0 ? 2 : 0)}%` }}
                  />
                </div>
                <span className="w-24 shrink-0 text-right text-caption font-medium tabular-nums">
                  {formatMoney(e)}
                </span>
              </div>
              <div className="flex items-center gap-3">
                <span className="w-16 shrink-0 text-caption text-muted-foreground">Recebido</span>
                <div className="h-2 min-w-0 flex-1 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-success/80 transition-default"
                    style={{ width: `${Math.max((r / maxValue) * 100, r > 0 ? 2 : 0)}%` }}
                  />
                </div>
                <span className="w-24 shrink-0 text-right text-caption font-medium tabular-nums">
                  {formatMoney(r)}
                </span>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function VerticalBars({
  categories,
  emitido,
  recebido,
  maxValue,
}: {
  categories: string[];
  emitido: number[];
  recebido: number[];
  maxValue: number;
}) {
  return (
    <div
      role="img"
      className="flex h-44 items-end justify-center gap-3 sm:gap-4"
    >
      {categories.map((category, index) => {
        const e = emitido[index] ?? 0;
        const r = recebido[index] ?? 0;
        const emitidoHeight = `${Math.max((e / maxValue) * 100, e > 0 ? 4 : 0)}%`;
        const recebidoHeight = `${Math.max((r / maxValue) * 100, r > 0 ? 4 : 0)}%`;
        return (
          <div key={category} className="flex w-14 flex-col items-center gap-1 sm:w-16">
            <div className="flex h-36 w-full items-end justify-center gap-1">
              <div
                className="w-5 max-w-[40%] rounded-t-sm bg-primary/80 transition-default"
                style={{ height: emitidoHeight }}
                title={`Emitido: ${formatMoney(e)}`}
              />
              <div
                className="w-5 max-w-[40%] rounded-t-sm bg-success/80 transition-default"
                style={{ height: recebidoHeight }}
                title={`Recebido: ${formatMoney(r)}`}
              />
            </div>
            <Typography variant="caption" tone="muted" className="truncate text-center text-[0.65rem]">
              {category}
            </Typography>
          </div>
        );
      })}
    </div>
  );
}

export function FinanceFlowChart({ data }: { data: ChartData }) {
  const maxValue = Math.max(...data.emitido, ...data.recebido, 1);
  const hasData = data.categories.length > 0;
  const useHorizontal = data.categories.length <= 3;

  const chartLabel = hasData
    ? `Fluxo financeiro: emitido e recebido nos últimos ${data.categories.length} meses`
    : "Sem dados de fluxo no período";

  return (
    <Card className="h-full">
      <CardHeader title="Fluxo financeiro" description="Emitido vs recebido por competência" />
      <CardBody>
        {!hasData ? (
          <Typography variant="body" tone="muted">
            Não há movimentação suficiente para exibir o gráfico neste período.
          </Typography>
        ) : (
          <>
            <div aria-label={chartLabel}>
              {useHorizontal ? (
                <HorizontalBars
                  categories={data.categories}
                  emitido={data.emitido}
                  recebido={data.recebido}
                />
              ) : (
                <VerticalBars
                  categories={data.categories}
                  emitido={data.emitido}
                  recebido={data.recebido}
                  maxValue={maxValue}
                />
              )}
            </div>
            <div className="mt-4 flex flex-wrap gap-4 border-t border-border pt-4">
              <span className="inline-flex items-center gap-2 text-caption text-muted-foreground">
                <span className="h-2 w-2 rounded-full bg-primary/80" aria-hidden />
                Emitido
              </span>
              <span className="inline-flex items-center gap-2 text-caption text-muted-foreground">
                <span className="h-2 w-2 rounded-full bg-success/80" aria-hidden />
                Recebido
              </span>
            </div>
            <table className="sr-only">
              <caption>Fluxo financeiro por competência</caption>
              <thead>
                <tr>
                  <th scope="col">Competência</th>
                  <th scope="col">Emitido</th>
                  <th scope="col">Recebido</th>
                </tr>
              </thead>
              <tbody>
                {data.categories.map((category, index) => (
                  <tr key={category}>
                    <td>{category}</td>
                    <td>{formatMoney(data.emitido[index])}</td>
                    <td>{formatMoney(data.recebido[index])}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        )}
      </CardBody>
    </Card>
  );
}
