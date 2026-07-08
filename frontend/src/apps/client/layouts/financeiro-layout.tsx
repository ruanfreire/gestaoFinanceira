import { Link } from "react-router-dom";
import { Button, Typography } from "@/design-system/atoms";
import { ProductSubNav } from "@/design-system/molecules";
import { ROUTES } from "@/lib/constants";
import { navCopy } from "@/shared/copy/pt-BR";
import { Outlet } from "react-router-dom";
import { useRecebimentosCounts } from "@/features/recebimentos/hooks";

const FINANCEIRO_NAV = [
  { to: ROUTES.financeiroNotas, label: navCopy.financeiroNotas },
  { to: ROUTES.financeiroConfirmar, label: navCopy.financeiroConfirmar },
  { to: ROUTES.financeiroEnviarNotas, label: navCopy.financeiroEnviarNotas },
  { to: ROUTES.financeiroEnviarExtrato, label: navCopy.financeiroEnviarExtrato },
  { to: ROUTES.financeiroHistorico, label: navCopy.financeiroHistorico },
];

export default function FinanceiroLayout() {
  const counts = useRecebimentosCounts();

  const items = FINANCEIRO_NAV.map((item) =>
    item.to === ROUTES.financeiroConfirmar
      ? { ...item, badge: counts.data?.pendentes }
      : item,
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Typography variant="title">{navCopy.financeiro}</Typography>
        <Button variant="outline" size="sm" asChild>
          <Link to={ROUTES.financeiroNotaNova}>Registrar nota</Link>
        </Button>
      </div>
      <ProductSubNav items={items} ariaLabel="Tarefas do financeiro" />
      <Outlet />
    </div>
  );
}
