import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { nfImportApi } from "../nf-import-api";
import type { NfImportAnalysisResult, NfImportProfile, NfImportProfileMapping, NfImportResult } from "../nf-import-types";
import { WizardTemplate } from "@/design-system/templates";
import {
  UploadArea,
  TaskGuide,
  NextStepBanner,
  StepHint,
  ErrorState,
  Callout,
  ChoiceCard,
  ChoiceCardGrid,
} from "@/design-system/molecules";
import { Card, CardBody, DataTable } from "@/design-system/organisms";
import type { DataTableColumn } from "@/design-system/organisms";
import { Button, Input, Label, Typography } from "@/design-system/atoms";
import { formatMoney } from "@/lib/format";
import { ROUTES } from "@/lib/constants";
import { useToast } from "@/app/toast-provider";
import { journeyNextSteps, screenTasks } from "@/lib/screen-tasks";

const STEPS = [
  { id: "origin", label: "Modelo" },
  { id: "file", label: "Arquivo" },
  { id: "preview", label: "Prévia" },
  { id: "confirm", label: "Confirmar" },
  { id: "result", label: "Resultado" },
];

const previewColumns: DataTableColumn<{ id: string; numero?: string; tomador?: string; valor?: number }>[] = [
  { id: "numero", header: "NF", cell: (f) => f.numero ?? "—" },
  { id: "tomador", header: "Tomador", cell: (f) => f.tomador ?? "—" },
  { id: "valor", header: "Valor", cell: (f) => formatMoney(f.valor) },
];

export default function ArquivosNotasPage() {
  const [step, setStep] = useState(0);
  const [mode, setMode] = useState<"new" | "profile">("new");
  const [selectedProfile, setSelectedProfile] = useState<NfImportProfile | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [analysis, setAnalysis] = useState<NfImportAnalysisResult | null>(null);
  const [mapping, setMapping] = useState<NfImportProfileMapping | null>(null);
  const [profileName, setProfileName] = useState("");
  const [saveAsProfile, setSaveAsProfile] = useState(false);
  const [result, setResult] = useState<NfImportResult | null>(null);
  const { toast } = useToast();
  const qc = useQueryClient();
  const task = screenTasks.arquivosNotas;

  const profilesQuery = useQuery({
    queryKey: ["nf-import-profiles"],
    queryFn: () => nfImportApi.listProfiles(),
  });

  const userProfiles = useMemo(() => profilesQuery.data ?? [], [profilesQuery.data]);

  const analyzeMutation = useMutation({
    mutationFn: (f: File) => nfImportApi.analyze(f),
  });

  const importMutation = useMutation({
    mutationFn: () => {
      if (!file || !mapping) throw new Error("Arquivo e mapeamento obrigatórios");
      const profileId =
        mode === "profile" && selectedProfile ? selectedProfile._id : "system:honest_v1";
      return nfImportApi.import(file, profileId, {
        mapping,
        profileName: saveAsProfile ? profileName : undefined,
        saveProfile: saveAsProfile && mode === "new",
      });
    },
  });

  const onFile = async (f: File) => {
    setFile(f);
    setResult(null);
    try {
      const res = await analyzeMutation.mutateAsync(f);
      setAnalysis(res);
      setMapping(res.mapping);
      setProfileName(res.profile_name_suggested || f.name.replace(/\.json$/i, ""));
      if (mode === "profile" && selectedProfile) {
        setMapping(selectedProfile.mapping);
      }
      setStep(2);
    } catch (err) {
      toast(nfImportApi.getError(err, "Falha ao analisar arquivo"), "error");
    }
  };

  const onImport = async () => {
    if (!file || !mapping) return;
    try {
      const preview = await nfImportApi.preview(file, mapping);
      if (!preview.valid || preview.rows_ok === 0) {
        toast(preview.errors[0] || "Nenhuma nota válida encontrada", "error");
        return;
      }
      const res = await importMutation.mutateAsync();
      setResult(res);
      setStep(4);
      qc.invalidateQueries({ queryKey: ["arquivos"] });
      qc.invalidateQueries({ queryKey: ["notas"] });
      qc.invalidateQueries({ queryKey: ["home"] });
      qc.invalidateQueries({ queryKey: ["nf-import-profiles"] });
      toast("Importação concluída", "success");
    } catch (err) {
      toast(nfImportApi.getError(err, "Falha ao importar"), "error");
    }
  };

  return (
    <WizardTemplate
      title="Enviar notas"
      description="Importe JSON com modelos configuráveis — Honest, padrão ou formato personalizado com IA"
      steps={STEPS}
      currentStep={step}
      taskGuide={<TaskGuide goal={task.goal} steps={task.steps} minutes={task.minutes} currentStep={step} />}
      stepHint={
        <StepHint>
          {step === 0 && "Escolha um modelo salvo ou crie um novo a partir do seu JSON."}
          {step === 1 && "Envie o arquivo JSON exportado do seu sistema."}
          {step === 2 && "Confira a leitura e os avisos antes de importar."}
          {step === 3 && "Confirme o nome do modelo e finalize."}
          {step === 4 && "Pronto! Siga para o próximo passo do fluxo."}
        </StepHint>
      }
    >
      {step === 0 && (
        <div className="stack-gap">
          <ChoiceCardGrid>
            {userProfiles.map((profile) => (
              <ChoiceCard
                key={profile._id}
                title={profile.name}
                description={
                  profile.description ||
                  (profile.system_key === "honest_v1"
                    ? "Sync Honest e exportações no formato padrão"
                    : "Modelo personalizado")
                }
                onClick={() => {
                  setMode("profile");
                  setSelectedProfile(profile);
                  setProfileName(profile.name);
                  setStep(1);
                }}
              />
            ))}
            <ChoiceCard
              title="Novo modelo"
              description="Primeira vez com este JSON — a IA sugere o mapeamento"
              onClick={() => {
                setMode("new");
                setSelectedProfile(userProfiles.find((p) => p.system_key === "honest_v1") ?? userProfiles[0] ?? null);
                setProfileName("");
                setStep(1);
              }}
            />
          </ChoiceCardGrid>
        </div>
      )}

      {step === 1 && (
        <UploadArea
          accept=".json,application/json"
          onFile={onFile}
          disabled={analyzeMutation.isPending}
          label={analyzeMutation.isPending ? "Analisando com IA…" : "Arraste o JSON ou toque para escolher"}
          hint="Qualquer estrutura — o sistema detecta ou aprende o formato"
        />
      )}

      {step === 2 && analysis && mapping && (
        <Card>
          <CardBody className="stack-gap">
            {analysis.total_notas === 0 ? (
              <ErrorState message="Nenhuma nota encontrada com este modelo." />
            ) : (
              <>
                <Typography variant="body">
                  ✓ <strong>{analysis.total_notas}</strong> nota(s) identificada(s)
                  {analysis.mapping.structure === "honest_v1" ? " · formato padrão/Honest" : " · formato personalizado"}
                </Typography>
                {analysis.ai_attempted && (
                  <Callout
                    variant={analysis.ai_applied ? "success" : "info"}
                    title={analysis.ai_applied ? "IA aplicada na leitura" : "IA consultada"}
                  >
                    <Typography variant="small">
                      {analysis.ai_applied
                        ? `Mapeamento refinado com ${analysis.ai_provider ?? "IA"}.`
                        : "A heurística já era suficiente; a IA confirmou a estrutura."}
                    </Typography>
                  </Callout>
                )}
                {analysis.gaps.length > 0 && (
                  <Callout variant="warning" title="Avisos">
                    <ul className="stack-gap-sm">
                      {analysis.gaps.slice(0, 5).map((g, i) => (
                        <li key={i}>
                          <Typography variant="small">• {g.message}</Typography>
                        </li>
                      ))}
                    </ul>
                  </Callout>
                )}
                <DataTable
                  columns={previewColumns}
                  data={analysis.sample.map((f, i) => ({
                    id: f.nota_api_id ?? f.numero ?? String(i),
                    numero: f.numero,
                    tomador: f.tomador,
                    valor: f.valor,
                  }))}
                  emptyTitle="Sem amostra"
                  emptyDescription="Não há notas na prévia."
                />
              </>
            )}
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setStep(1)}>
                Voltar
              </Button>
              <Button disabled={analysis.total_notas === 0} onClick={() => setStep(3)}>
                Continuar
              </Button>
            </div>
          </CardBody>
        </Card>
      )}

      {step === 3 && (
        <Card>
          <CardBody className="stack-gap">
            <Typography variant="body">
              Importar <strong>{file?.name}</strong>
              {selectedProfile ? ` com modelo “${selectedProfile.name}”` : ""}
            </Typography>
            {mode === "new" && (
              <div className="stack-gap-sm">
                <div>
                  <Label htmlFor="profile-name">Nome do modelo (opcional)</Label>
                  <Input
                    id="profile-name"
                    value={profileName}
                    onChange={(e) => setProfileName(e.target.value)}
                    placeholder="Ex.: ERP Contábil XYZ"
                  />
                </div>
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={saveAsProfile}
                    onChange={(e) => setSaveAsProfile(e.target.checked)}
                  />
                  Salvar este mapeamento para próximas importações
                </label>
              </div>
            )}
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setStep(2)}>
                Voltar
              </Button>
              <Button onClick={onImport} loading={importMutation.isPending}>
                Importar notas
              </Button>
            </div>
          </CardBody>
        </Card>
      )}

      {step === 4 && result && (
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
