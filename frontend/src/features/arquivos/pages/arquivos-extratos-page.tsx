import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { arquivosApi } from "../api";
import { parseCsvFilePreview } from "../utils";
import type { BancoExtrato, ExtratoUploadResult } from "../types";
import { WizardTemplate } from "@/design-system/templates";
import { UploadArea, TaskGuide, NextStepBanner, StepHint, ErrorState, ChoiceCard, ChoiceCardGrid } from "@/design-system/molecules";
import { Card, CardBody } from "@/design-system/organisms";
import { Button, Typography } from "@/design-system/atoms";
import { ROUTES } from "@/lib/constants";
import { useToast } from "@/app/toast-provider";
import { bancoLabel } from "@/lib/format";
import { journeyNextSteps, screenTasks } from "@/lib/screen-tasks";

const STEPS = [
  { id: "banco", label: "Banco" },
  { id: "file", label: "Arquivo" },
  { id: "preview", label: "Conferir" },
  { id: "result", label: "Resultado" },
];

const STEP_HINTS = [
  "Escolha de qual banco veio o extrato.",
  "Exporte o CSV no app do banco e arraste aqui.",
  "Confira o número de linhas e toque em Importar.",
  "Extrato importado! Confirme os recebimentos que ficaram pendentes.",
];

export default function ArquivosExtratosPage() {
  const [step, setStep] = useState(0);
  const [banco, setBanco] = useState<BancoExtrato | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<Awaited<ReturnType<typeof parseCsvFilePreview>> | null>(null);
  const [result, setResult] = useState<ExtratoUploadResult | null>(null);
  const upload = useMutation({
    mutationFn: ({ b, f }: { b: BancoExtrato; f: File }) => arquivosApi.uploadExtrato(b, f),
  });
  const { toast } = useToast();
  const qc = useQueryClient();
  const task = screenTasks.arquivosExtratos;

  const onFile = async (f: File) => {
    setFile(f);
    const p = await parseCsvFilePreview(f);
    setPreview(p);
    setStep(2);
  };

  const onUpload = async () => {
    if (!file || !banco || !preview?.valid) return;
    try {
      const res = await upload.mutateAsync({ b: banco, f: file });
      setResult(res);
      setStep(3);
      qc.invalidateQueries({ queryKey: ["arquivos"] });
      qc.invalidateQueries({ queryKey: ["home"] });
      qc.invalidateQueries({ queryKey: ["recebimentos"] });
      toast("Extrato importado", "success");
    } catch (err) {
      toast(arquivosApi.getError(err, "Falha ao importar"), "error");
    }
  };

  return (
    <WizardTemplate
      title="Enviar extrato bancário"
      description="Envie o CSV do Asaas ou Nubank"
      steps={STEPS}
      currentStep={step}
      taskGuide={
        <TaskGuide goal={task.goal} steps={task.steps} minutes={task.minutes} currentStep={step} />
      }
      stepHint={<StepHint>{STEP_HINTS[step]}</StepHint>}
    >
      {step === 0 && (
        <ChoiceCardGrid>
          {(["asaas", "nubank"] as const).map((b) => (
            <ChoiceCard
              key={b}
              title={bancoLabel(b)}
              description={`Arquivo CSV exportado do ${bancoLabel(b)}`}
              onClick={() => {
                setBanco(b);
                setStep(1);
              }}
            />
          ))}
        </ChoiceCardGrid>
      )}

      {step === 1 && banco && (
        <div className="stack-gap">
          <Typography variant="body">
            Banco: <strong>{bancoLabel(banco)}</strong>
          </Typography>
          <UploadArea accept=".csv,text/csv" onFile={onFile} label="Arraste o CSV ou toque para escolher" />
          <Button variant="outline" onClick={() => setStep(0)}>
            Voltar
          </Button>
        </div>
      )}

      {step === 2 && preview && (
        <Card>
          <CardBody className="stack-gap">
            {!preview.valid ? (
              <>
                <ErrorState message={preview.error ?? "CSV vazio ou inválido"} />
                <Typography variant="caption">
                  Baixe o extrato novamente no {banco ? bancoLabel(banco) : "banco"} e confira se é um arquivo CSV.
                </Typography>
                <Button variant="outline" onClick={() => setStep(1)}>
                  Escolher outro arquivo
                </Button>
              </>
            ) : (
              <>
                <Typography variant="body">
                  ✓ {preview.lineCount} linha(s) · Colunas: {preview.headers.join(", ")}
                </Typography>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => setStep(1)}>
                    Voltar
                  </Button>
                  <Button disabled={upload.isPending} onClick={onUpload} loading={upload.isPending}>
                    Importar
                  </Button>
                </div>
              </>
            )}
          </CardBody>
        </Card>
      )}

      {step === 3 && result && (
        <Card>
          <CardBody className="stack-gap">
            <Typography variant="subtitle" className="text-success">
              Extrato importado
            </Typography>
            <Typography variant="body">
              {result.conciliado_auto ?? 0} automáticos · {result.pendente_vinculo ?? 0} precisam de confirmação ·{" "}
              {result.sem_match ?? 0} sem nota
            </Typography>
            <NextStepBanner {...journeyNextSteps.afterExtratoImport} />
            <Button variant="outline" asChild>
              <Link to={ROUTES.arquivosHistorico}>Ver histórico</Link>
            </Button>
          </CardBody>
        </Card>
      )}
    </WizardTemplate>
  );
}
