import { useEffect, useState } from "react";
import DropZone from "@ui/components/form/DropZone";
import Alert from "@ui/components/ui/alert/Alert";
import Button from "@ui/components/ui/button/Button";
import ComponentCard from "@ui/components/common/ComponentCard";
import Spinner from "@ui/components/ui/spinner/Spinner";
import { useToast } from "@ui/components/ui/toast/ToastContext";
import { importacoesFaturasService } from "../services/importacoes-faturas.service";
import { useUploadImportacaoFaturaMutation } from "../hooks/useImportacaoFaturaMutations";
import type { ImportacaoUploadResult, JsonFilePreview } from "../types/importacao-fatura.types";
import { parseJsonFilePreview } from "../utils/json-preview.util";
import { JsonImportPreviewTable } from "./FaturasTable";

type JsonFileUploadProps = {
  onSuccess?: (result: ImportacaoUploadResult) => void;
};

export function JsonFileUpload({ onSuccess }: JsonFileUploadProps) {
  const toast = useToast();
  const mutation = useUploadImportacaoFaturaMutation();

  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<JsonFilePreview | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [result, setResult] = useState<ImportacaoUploadResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!file) {
      setPreview(null);
      return;
    }

    let cancelled = false;
    setPreviewLoading(true);
    parseJsonFilePreview(file)
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

  const handleDrop = (accepted: File[]) => {
    const next = accepted[0];
    if (!next) return;
    setFile(next);
    setResult(null);
    setError(null);
  };

  const handleUpload = async () => {
    if (!file || !preview?.valid) return;

    setError(null);
    setResult(null);

    try {
      const data = await mutation.mutateAsync(file);
      setResult(data);
      setFile(null);
      setPreview(null);
      toast.showToast({ variant: "success", title: "Importação concluída com sucesso." });
      onSuccess?.(data);
    } catch (err) {
      const msg = importacoesFaturasService.getUploadErrorMessage(err);
      setError(msg);
      toast.showToast({ variant: "error", title: msg });
    }
  };

  return (
    <div className="max-w-3xl space-y-4">
      <DropZone
        onDrop={handleDrop}
        accept={{ "application/json": [".json"] }}
        maxFiles={1}
        file={file}
        onClear={() => {
          setFile(null);
          setPreview(null);
          setError(null);
        }}
        disabled={mutation.isPending}
        idleLabel="Arraste um arquivo .json ou clique para selecionar"
        activeLabel="Solte o arquivo aqui..."
        description="Formato: data → empresa → nf_lista → items"
      />

      {previewLoading && (
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <Spinner size="sm" />
          Analisando arquivo...
        </div>
      )}

      {preview && !preview.valid && (
        <Alert variant="error" title="JSON inválido" message={preview.error ?? "Estrutura não reconhecida."} />
      )}

      {preview?.valid && (
        <ComponentCard
          title="Pré-visualização"
          desc={`${preview.totalFaturas} fatura(s) em ${preview.empresas || 1} empresa(s) detectada(s) no arquivo.`}
        >
          <JsonImportPreviewTable items={preview.sample} total={preview.totalFaturas} />
        </ComponentCard>
      )}

      <div className="flex gap-3">
        <Button
          onClick={handleUpload}
          disabled={!file || !preview?.valid || mutation.isPending}
        >
          {mutation.isPending ? "Importando..." : "Importar"}
        </Button>
      </div>

      {error && <Alert variant="error" title="Falha na importação" message={error} />}

      {result?.ok && (
        <Alert
          variant="success"
          title="Importação concluída"
          message={`${result.imported ?? 0} importada(s), ${result.updated ?? 0} atualizada(s), ${result.ignored ?? 0} ignorada(s).`}
        />
      )}
    </div>
  );
}
