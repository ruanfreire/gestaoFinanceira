import { Link } from "react-router-dom";
import ComponentCard from "@ui/components/common/ComponentCard";
import Button from "@ui/components/ui/button/Button";
import { PageHeader } from "@/shared/components/PageHeader";
import { CsvExtratoUpload } from "../components/CsvUploadCard";

export default function ImportarExtratosPage() {
  return (
    <>
      <PageHeader
        title="Importar Extratos"
        description="Envie CSV do Asaas ou Nubank. Após a leitura, você verá todos os lançamentos importados."
        actions={
          <Link to="/importacoes-bancarias/historico">
            <Button variant="outline">Ver histórico</Button>
          </Link>
        }
      />

      <CsvExtratoUpload />

      <ComponentCard
        title="Conciliação manual"
        desc="Vincule pagamentos Asaas ou Nubank às notas corretas, inclusive pagamentos parciais."
        className="mt-6"
      >
        <Link to="/conciliacao">
          <Button variant="outline">Abrir conciliação</Button>
        </Link>
      </ComponentCard>
    </>
  );
}
