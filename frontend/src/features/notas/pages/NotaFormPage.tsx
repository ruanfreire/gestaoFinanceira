import { useNavigate } from "react-router-dom";
import { PageHeader } from "@/shared/components/PageHeader";
import { NotaForm } from "../components/NotaForm";

export default function NotaFormPage() {
  const navigate = useNavigate();

  return (
    <>
      <PageHeader
        title="Nova Nota"
        description="Cadastro manual de nota fiscal."
      />
      <NotaForm onSuccess={() => navigate("/notas")} onCancel={() => navigate("/notas")} />
    </>
  );
}
