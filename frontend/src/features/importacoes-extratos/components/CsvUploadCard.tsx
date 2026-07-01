import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import DropZone from "@ui/components/form/DropZone";
import Alert from "@ui/components/ui/alert/Alert";
import Button from "@ui/components/ui/button/Button";
import ComponentCard from "@ui/components/common/ComponentCard";
import Spinner from "@ui/components/ui/spinner/Spinner";
import { useToast } from "@ui/components/ui/toast/ToastContext";
import { useUploadExtratoMutation } from "../hooks/useImportacaoExtratoMutations";
import { importacoesExtratosService } from "../services/importacoes-extratos.service";
import type { BancoExtrato, CsvFilePreview } from "../types/importacao-extrato.types";
import { parseCsvFilePreview } from "../utils/importacao-extrato-display.util";
import { CsvPreviewPanel } from "./CsvPreviewPanel";

type CsvUploadCardProps = {
  banco: BancoExtrato;
  title: string;
  description: string;
};

export function CsvUploadCard({ banco, title, description }: CsvUploadCardProps) {
  const navigate = useNavigate();
  const toast = useToast();
  const mutation = useUploadExtratoMutation(banco);

  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<CsvFilePreview | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!file) {
      setPreview(null);
      return;
    }

    let cancelled = false;
    setPreviewLoading(true);
    parseCsvFilePreview(file)
      .then((parsed) => {
        if (!cancelled) setPreview(parsed);
      })
      .finally(() => {
        if (!cancelled) setPreviewLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [file]);

  const handleUpload = async () => {
    if (!file || !preview?.valid) return;

    setError(null);
    try {
      const result = await mutation.mutateAsync(file);
      setFile(null);
      setPreview(null);
      toast.showToast({ variant: "success", title: "Extrato importado com sucesso." });

      if (result.ok && result.importacao_id) {
        navigate(`/importacoes-bancarias/historico/${banco}/${String(result.importacao_id)}`);
      }
    } catch (err) {
      const msg = importacoesExtratosService.getUploadErrorMessage(err);
      setError(msg);
      toast.showToast({ variant: "error", title: msg });
    }
  };

  return (
    <ComponentCard title={title} desc={description}>
      <DropZone
        onDrop={(accepted) => {
          const next = accepted[0];
          if (!next) return;
          setFile(next);
          setError(null);
        }}
        accept={{ "text/csv": [".csv"] }}
        maxFiles={1}
        file={file}
        onClear={() => {
          setFile(null);
          setPreview(null);
          setError(null);
        }}
        disabled={mutation.isPending}
        idleLabel="Arraste o extrato .csv ou clique para selecionar"
        activeLabel="Solte o CSV aqui..."
      />

      {previewLoading && (
        <div className="mt-3 flex items-center gap-2 text-sm text-gray-500">
          <Spinner size="sm" />
          Analisando CSV...
        </div>
      )}

      {preview && !preview.valid && (
        <div className="mt-3">
          <Alert variant="error" title="CSV inválido" message={preview.error ?? "Arquivo inválido."} />
        </div>
      )}

      {preview?.valid && (
        <div className="mt-4">
          <CsvPreviewPanel preview={preview} />
        </div>
      )}

      <div className="mt-4">
        <Button onClick={handleUpload} disabled={!file || !preview?.valid || mutation.isPending}>
          {mutation.isPending ? "Lendo arquivo..." : "Importar e ver lançamentos"}
        </Button>
      </div>

      {error && (
        <div className="mt-3">
          <Alert variant="error" title="Falha na importação" message={error} />
        </div>
      )}
    </ComponentCard>
  );
}

export function CsvExtratoUpload() {
  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
      <CsvUploadCard
        banco="asaas"
        title="Asaas — Extrato CSV"
        description="Importa todas as entradas e saídas do extrato. Cobranças recebidas são conciliadas com NF; demais linhas ficam no extrato."
      />
      <CsvUploadCard
        banco="nubank"
        title="Nubank — Extrato CSV"
        description="Importa créditos e débitos da conta ou cartão. Créditos entram na conciliação; saídas compõem o fluxo de caixa."
      />
    </div>
  );
}
