import { Link } from "react-router-dom";
import { Button } from "@/design-system/atoms";
import { EmptyState } from "@/design-system/molecules";
import { ROUTES } from "@/lib/constants";

export default function NotFoundPage() {
  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-16">
      <div className="w-full max-w-md stack-gap items-center text-center">
        <EmptyState
          title="Página não encontrada"
          description="Este endereço não existe ou foi movido. Volte ao início para continuar."
        />
        <Button asChild>
          <Link to={ROUTES.home}>Voltar ao início</Link>
        </Button>
      </div>
    </div>
  );
}
