import { Link, useNavigate } from "react-router-dom";
import Button from "@ui/components/ui/button/Button";
import { PageHeader } from "@/shared/components/PageHeader";
import { JsonFileUpload } from "../components/JsonFileUpload";
import type { ImportacaoUploadResult } from "../types/importacao-fatura.types";

export default function ImportarFaturasPage() {
  const navigate = useNavigate();

  const handleSuccess = (result: ImportacaoUploadResult) => {
    if (result.id) {
      navigate(`/importacoes/historico/${result.id}`);
    }
  };

  return (
    <>
      <PageHeader
        title="Importar Notas"
        description="Envie um arquivo JSON no formato: data → empresa → nf_lista → items"
        actions={
          <Link to="/importacoes/historico">
            <Button variant="outline">Ver histórico</Button>
          </Link>
        }
      />
      <JsonFileUpload onSuccess={handleSuccess} />
    </>
  );
}
