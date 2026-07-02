import { useMemo, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { arquivosApi } from "../api";
import { parseJsonFilePreview } from "../utils";
import { WizardTemplate } from "@/design-system/templates";
import { UploadArea, TaskGuide, NextStepBanner, StepHint, ErrorState, Callout } from "@/design-system/molecules";
import { Card, CardBody, DataTable } from "@/design-system/organisms";
import type { DataTableColumn } from "@/design-system/organisms";
import type { FaturaPreview } from "../types";
import { Button, Typography } from "@/design-system/atoms";
import { formatMoney } from "@/lib/format";
import { ROUTES } from "@/lib/constants";
import { useToast } from "@/app/toast-provider";
import { journeyNextSteps, screenTasks } from "@/lib/screen-tasks";
import type { ImportacaoUploadResult } from "../types";

type WizardStep = "file" | "preview" | "issues" | "upload" | "result";

const previewColumns: DataTableColumn<FaturaPreview & { id: string }>[] = [
  { id: "numero", header: "NF", cell: (f) => f.numero ?? "—" },
  { id: "tomador", header: "Tomador", cell: (f) => f.tomador ?? "—" },
  { id: "valor", header: "Valor", cell: (f) => formatMoney(f.valor) },
];

const STEP_HINTS: Record<WizardStep, string> = {
  file: "Exporte o JSON do seu sistema de notas e arraste o arquivo aqui.",
  preview: "Confira se o número de notas está correto antes de continuar.",
  issues: "Revise os avisos abaixo. Você pode enviar mesmo assim se estiver de acordo.",
  upload: "Toque em Enviar — leva poucos segundos.",
  result: "Importação concluída! Siga para o próximo passo.",
};

function buildWizardSteps(hasIssues: boolean) {
  const steps = [
    { id: "file", label: "Arquivo" },
    { id: "preview", label: "Conferir" },
  ];
  if (hasIssues) steps.push({ id: "issues", label: "Inconsistências" });
  steps.push({ id: "upload", label: "Enviar" }, { id: "result", label: "Resultado" });
  return steps;
}

export default function ArquivosNotasPage() {
  const [step, setStep] = useState<WizardStep>("file");
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<Awaited<ReturnType<typeof parseJsonFilePreview>> | null>(null);
  const [result, setResult] = useState<ImportacaoUploadResult | null>(null);
  const upload = useMutation({ mutationFn: (f: File) => arquivosApi.uploadNotas(f) });
  const { toast } = useToast();
  const qc = useQueryClient();
  const task = screenTasks.arquivosNotas;

  const steps = useMemo(() => buildWizardSteps(Boolean(preview?.inconsistencies.length)), [preview?.inconsistencies.length]);
  const currentStepIndex = Math.max(0, steps.findIndex((s) => s.id === step));

  const onFile = async (f: File) => {
    setFile(f);
    const parsed = await parseJsonFilePreview(f);
    setPreview(parsed);
    setStep("preview");
  };

  const continueFromPreview = () => {
    if (!preview?.valid) return;
    if (preview.inconsistencies.length > 0) setStep("issues");
    else setStep("upload");
  };

  const onUpload = async () => {
    if (!file || !preview?.valid) return;
    try {
      const res = await upload.mutateAsync(file);
      setResult(res);
      setStep("result");
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
      steps={steps}
      currentStep={currentStepIndex}
      taskGuide={
        <TaskGuide goal={task.goal} steps={task.steps} minutes={task.minutes} currentStep={currentStepIndex} />
      }
      stepHint={<StepHint>{STEP_HINTS[step]}</StepHint>}
    >
      {step === "file" && (
        <UploadArea
          accept=".json,application/json"
          onFile={onFile}
          label="Arraste o arquivo JSON ou toque para escolher"
          hint="Estrutura: empresas com lista de notas"
        />
      )}

      {step === "preview" && preview && (
        <Card>
          <CardBody className="stack-gap">
            {!preview.valid ? (
              <>
                <ErrorState message={preview.error ?? "Estrutura não reconhecida"} />
                <Typography variant="caption">
                  Verifique se o arquivo é o JSON exportado do seu sistema de notas e tente novamente.
                </Typography>
                <Button variant="outline" onClick={() => setStep("file")}>
                  Escolher outro arquivo
                </Button>
              </>
            ) : (
              <>
                <Typography variant="body">
                  ✓ {preview.empresas} empresa(s) · {preview.totalFaturas} nota(s) encontrada(s)
                </Typography>
                {preview.inconsistencies.length > 0 && (
                  <Callout variant="warning" title="Avisos encontrados">
                    <Typography variant="small">
                      {preview.inconsistencies.length} inconsistência(s) serão detalhadas no próximo passo.
                    </Typography>
                  </Callout>
                )}
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
                  <Button variant="outline" onClick={() => setStep("file")}>
                    Voltar
                  </Button>
                  <Button onClick={continueFromPreview}>Continuar</Button>
                </div>
              </>
            )}
          </CardBody>
        </Card>
      )}

      {step === "issues" && preview && (
        <Card>
          <CardBody className="stack-gap">
            <Callout variant="warning" title={`${preview.inconsistencies.length} inconsistência(s) no arquivo`}>
              <Typography variant="small">
                O sistema ainda pode importar o arquivo. Confira se os avisos abaixo são aceitáveis para o seu caso.
              </Typography>
            </Callout>
            <ul className="stack-gap rounded-lg border border-border p-4">
              {preview.inconsistencies.slice(0, 20).map((issue, index) => (
                <li key={`${issue.type}-${index}`}>
                  <Typography variant="small">• {issue.message}</Typography>
                </li>
              ))}
            </ul>
            {preview.inconsistencies.length > 20 && (
              <Typography variant="caption" tone="muted">
                … e mais {preview.inconsistencies.length - 20} aviso(s).
              </Typography>
            )}
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setStep("preview")}>
                Voltar
              </Button>
              <Button onClick={() => setStep("upload")}>Continuar mesmo assim</Button>
            </div>
          </CardBody>
        </Card>
      )}

      {step === "upload" && (
        <Card>
          <CardBody className="stack-gap">
            <Typography variant="body">
              Pronto para enviar <strong>{file?.name}</strong>
            </Typography>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setStep(preview?.inconsistencies.length ? "issues" : "preview")}>
                Voltar
              </Button>
              <Button onClick={onUpload} loading={upload.isPending}>
                Enviar arquivo
              </Button>
            </div>
          </CardBody>
        </Card>
      )}

      {step === "result" && result && (
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
