import { Link } from "react-router-dom";
import Button from "@ui/components/ui/button/Button";
import ComponentCard from "@ui/components/common/ComponentCard";
import { DownloadIcon, DollarLineIcon, FileIcon, PlusIcon } from "@ui/icons";

export function DashboardQuickActions() {
  return (
    <ComponentCard compact title="Ações rápidas" desc="Atalhos para as tarefas mais frequentes.">
      <div className="flex flex-wrap gap-2">
        <Link to="/conciliacao">
          <Button size="sm" startIcon={<DollarLineIcon className="size-4" />}>
            Conciliar
          </Button>
        </Link>
        <Link to="/importacoes">
          <Button variant="outline" size="sm" startIcon={<DownloadIcon className="size-4" />}>
            Importar NF
          </Button>
        </Link>
        <Link to="/importacoes-bancarias">
          <Button variant="outline" size="sm" startIcon={<DownloadIcon className="size-4" />}>
            Importar extrato
          </Button>
        </Link>
        <Link to="/notas/new">
          <Button variant="outline" size="sm" startIcon={<PlusIcon className="size-4" />}>
            Nova nota
          </Button>
        </Link>
        <Link to="/relatorios/extracao">
          <Button variant="ghost" size="sm" startIcon={<FileIcon className="size-4" />}>
            Relatórios
          </Button>
        </Link>
      </div>
    </ComponentCard>
  );
}
