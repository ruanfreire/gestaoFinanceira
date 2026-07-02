import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { arquivosApi } from "../api";
import { parseJsonFilePreview } from "../utils";
import { WizardTemplate } from "@/design-system/templates";
import { UploadArea, TaskGuide, NextStepBanner, StepHint, ErrorState } from "@/design-system/molecules";
import { Card, CardBody, DataTable } from "@/design-system/organisms";
import type { DataTableColumn } from "@/design-system/organisms";
import type { FaturaPreview } from "../types";
import { Button, Typography } from "@/design-system/atoms";
import { formatMoney } from "@/lib/format";
import { ROUTES } from "@/lib/constants";
import { useToast } from "@/app/toast-provider";
import { journeyNextSteps, screenTasks } from "@/lib/screen-tasks";
import type { ImportacaoUploadResult } from "../types";

const STEPS = [
  { id: "file", label: "Arquivo" },
  { id: "preview", label: "Conferir" },
  { id: "upload", label: "Enviar" },
  { id: "result", label: "Resultado" },
];

const previewColumns: DataTableColumn<FaturaPreview & { id: string }>[] = [
  { id: "numero", header: "NF", cell: (f) => f.numero ?? "—" },
  { id: "tomador", header: "Tomador", cell: (f) => f.tomador ?? "—" },
  { id: "valor", header: "Valor", cell: (f) => formatMoney(f.valor) },
];

const STEP_HINTS = [
  "Exporte o JSON do seu sistema de notas e arraste o arquivo aqui.",
  "Confira se o número de notas está correto antes de continuar.",
  "Toque em Enviar — leva poucos segundos.",
  "Importação concluída! Siga para o próximo passo.",
];

export default function ArquivosNotasPage() {
  const [step, setStep] = useState(0);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<Awaited<ReturnType<typeof parseJsonFilePreview>> | null>(null);
  const [result, setResult] = useState<ImportacaoUploadResult | null>(null);
  const upload = useMutation({ mutationFn: (f: File) => arquivosApi.uploadNotas(f) });
  const { toast } = useToast();
  const qc = useQueryClient();
  const task = screenTasks.arquivosNotas;

  const onFile = async (f: File) => {
    setFile(f);
    setPreview(await parseJsonFilePreview(f));
    setStep(1);
  };

  const onUpload = async () => {
    if (!file || !preview?.valid) return;
    try {
      const res = await upload.mutateAsync(file);
      setResult(res);
      setStep(3);
      qc.invalidateQueries({ queryKey: ["arquivos"] });
      qc.invalidateQueries({ queryKey: ["notas"] });
      qc.invalidateQueries({ queryKey: ["home"] });
      toast("Importação concluída", "success");
    } catch (err) {
      toast(arquivosApi.getError(err, "Falha ao importar"), "error");
    }
  };

  return (
    <WizardTemplate
      title="Enviar notas"
      description="Envie o arquivo JSON com suas notas fiscais"
      steps={STEPS}
      currentStep={step}
      taskGuide={
        <TaskGuide goal={task.goal} steps={task.steps} minutes={task.minutes} currentStep={step} />
      }
      stepHint={<StepHint>{STEP_HINTS[step]}</StepHint>}
    >
      {step === 0 && (
        <UploadArea
          accept=".json,application/json"
          onFile={onFile}
          label="Arraste o arquivo JSON ou toque para escolher"
          hint="Estrutura: empresas com lista de notas"
        />
      )}

      {step === 1 && preview && (
        <Card>
          <CardBody className="stack-gap">
            {!preview.valid ? (
              <>
                <ErrorState message={preview.error ?? "Estrutura não reconhecida"} />
                <Typography variant="caption">
                  Verifique se o arquivo é o JSON exportado do seu sistema de notas e tente novamente.
                </Typography>
                <Button variant="outline" onClick={() => setStep(0)}>
                  Escolher outro arquivo
                </Button>
              </>
            ) : (
              <>
                <Typography variant="body">
                  ✓ {preview.empresas} empresa(s) · {preview.totalFaturas} nota(s) encontrada(s)
                </Typography>
                <DataTable
                  columns={previewColumns}
                  data={preview.sample.map((f, i) => ({
                    ...f,
                    id: f.nota_api_id ?? f.numero ?? String(i),
                  }))}
                  emptyTitle="Nenhuma nota na amostra"
                  emptyDescription="O arquivo não contém notas para pré-visualizar."
                />
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => setStep(0)}>
                    Voltar
                  </Button>
                  <Button onClick={() => setStep(2)}>
                    Continuar
                  </Button>
                </div>
              </>
            )}
          </CardBody>
        </Card>
      )}

      {step === 2 && (
        <Card>
          <CardBody className="stack-gap">
            <Typography variant="body">
              Pronto para enviar <strong>{file?.name}</strong>
            </Typography>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setStep(1)}>
                Voltar
              </Button>
              <Button onClick={onUpload} loading={upload.isPending}>
                Enviar arquivo
              </Button>
            </div>
          </CardBody>
        </Card>
      )}

      {step === 3 && result && (
        <Card>
          <CardBody className="stack-gap">
            <Typography variant="subtitle" className="text-success">
              Importação concluída
            </Typography>
            <Typography variant="body">
              {result.imported} novas · {result.updated} atualizadas · {result.ignored} ignoradas
            </Typography>
            <NextStepBanner {...journeyNextSteps.afterNotasImport} />
            <Button variant="outline" asChild>
              <Link to={ROUTES.arquivosHistorico}>Ver histórico</Link>
            </Button>
          </CardBody>
        </Card>
      )}
    </WizardTemplate>
  );
}
