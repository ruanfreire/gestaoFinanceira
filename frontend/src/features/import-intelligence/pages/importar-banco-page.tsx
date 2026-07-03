import { useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { importIntelligenceApi } from "../api";
import type {
  ImportAnalysisResult,
  ImportPresetKey,
  ImportProfile,
  ImportProfileMapping,
  ImportResult,
} from "../types";
import { ImportFormatExample } from "../components/import-format-example";
import { ImportReadingPreview } from "../components/import-reading-preview";
import { ProfileChoiceCard } from "../components/profile-choice-card";
import { WizardTemplate } from "@/design-system/templates";
import { UploadArea, TaskGuide, NextStepBanner, StepHint, ErrorState, ChoiceCard, ChoiceCardGrid } from "@/design-system/molecules";
import { Card, CardBody, ConfirmDialog, Modal } from "@/design-system/organisms";
import { Button, Input, Label, Typography } from "@/design-system/atoms";
import { ROUTES } from "@/lib/constants";
import { useToast } from "@/app/toast-provider";
import { journeyNextSteps } from "@/lib/screen-tasks";
import { loadFluxoDefaults } from "@/features/analises/hooks/use-fluxo-defaults";

const STEPS = [
  { id: "origin", label: "Origem" },
  { id: "file", label: "Arquivo" },
  { id: "analysis", label: "Prévia" },
  { id: "confirm", label: "Confirmar" },
  { id: "result", label: "Resultado" },
];

const STEP_HINTS = [
  "Escolha um banco já configurado ou importe um extrato novo.",
  "Envie o extrato exportado do internet banking.",
  "Veja como o sistema leu seu arquivo antes de importar.",
  "Confirme o nome do banco e finalize.",
  "Pronto! Confira recebimentos pendentes se houver.",
];

const TASK = {
  goal: "Importar extrato bancário",
  steps: ["Escolha o banco", "Envie o arquivo", "Confira e importe"],
  minutes: 3,
};

function mappingChanged(before: ImportProfileMapping, after: ImportProfileMapping) {
  return JSON.stringify(before) !== JSON.stringify(after);
}

function profileCardDescription(profile: ImportProfile): string {
  const parts: string[] = [];
  if (profile.empresa_nome?.trim()) parts.push(profile.empresa_nome.trim());
  const label = profile.banco_label?.trim();
  if (label && label !== profile.name.trim()) parts.push(label);
  if (profile.conta_corrente?.trim()) parts.push(`Conta ${profile.conta_corrente.trim()}`);
  if (profile.usage_count && profile.usage_count > 0) {
    parts.push(`${profile.usage_count} importação${profile.usage_count === 1 ? "" : "ões"}`);
  }
  return parts.join(" · ") || "Configuração salva";
}

function applyProfileHeaderFields(profile: ImportProfile) {
  return {
    profileName: profile.name,
    bancoLabel: profile.banco_label,
    empresaNome: profile.empresa_nome ?? "",
    empresaCnpj: profile.empresa_cnpj ?? "",
    contaCorrente: profile.conta_corrente ?? "",
  };
}

function applyFluxoDefaultHeaderFields() {
  const defaults = loadFluxoDefaults();
  return {
    empresaNome: defaults.empresaNome,
    empresaCnpj: defaults.empresaCnpj,
    contaCorrente: defaults.contaCorrente,
  };
}

export default function ImportarBancoPage() {
  const [step, setStep] = useState(0);
  const [mode, setMode] = useState<"new" | "profile">("new");
  const [presetKey, setPresetKey] = useState<ImportPresetKey | null>(null);
  const [selectedProfile, setSelectedProfile] = useState<ImportProfile | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [analysis, setAnalysis] = useState<ImportAnalysisResult | null>(null);
  const [mapping, setMapping] = useState<ImportProfileMapping | null>(null);
  const originalMappingRef = useRef<ImportProfileMapping | null>(null);
  const [profileName, setProfileName] = useState("");
  const [bancoLabel, setBancoLabel] = useState("");
  const [empresaNome, setEmpresaNome] = useState("");
  const [empresaCnpj, setEmpresaCnpj] = useState("");
  const [contaCorrente, setContaCorrente] = useState("");
  const [savedProfile, setSavedProfile] = useState<ImportProfile | null>(null);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [refreshingPreview, setRefreshingPreview] = useState(false);
  const [editProfile, setEditProfile] = useState<ImportProfile | null>(null);
  const [deleteProfileTarget, setDeleteProfileTarget] = useState<ImportProfile | null>(null);
  const [editName, setEditName] = useState("");
  const [editBancoLabel, setEditBancoLabel] = useState("");
  const [editEmpresaNome, setEditEmpresaNome] = useState("");
  const [editEmpresaCnpj, setEditEmpresaCnpj] = useState("");
  const [editConta, setEditConta] = useState("");
  const { toast } = useToast();
  const qc = useQueryClient();

  const profilesQuery = useQuery({
    queryKey: ["import-profiles"],
    queryFn: () => importIntelligenceApi.listProfiles(),
  });

  const userProfiles = useMemo(() => profilesQuery.data ?? [], [profilesQuery.data]);

  const analyzeMutation = useMutation({
    mutationFn: ({ f, preset }: { f: File; preset?: ImportPresetKey }) =>
      importIntelligenceApi.analyze(f, preset),
  });

  const importMutation = useMutation({
    mutationFn: async () => {
      if (!file || !mapping) throw new Error("Arquivo e mapeamento obrigatórios");

      let profile = savedProfile || selectedProfile;
      const mappingBefore = originalMappingRef.current;

      const headerPayload = {
        empresa_nome: empresaNome.trim() || undefined,
        empresa_cnpj: empresaCnpj.trim() || undefined,
        conta_corrente: contaCorrente.trim() || undefined,
      };

      if (!profile) {
        profile = await importIntelligenceApi.saveProfile({
          name: profileName.trim() || bancoLabel.trim() || "Meu banco",
          banco_label: bancoLabel.trim() || analysis?.banco_label_suggested || "Banco",
          ...headerPayload,
          mapping,
          confidence_score: analysis?.overall_confidence,
          file_kind: analysis?.file_kind === "json" ? "json" : "csv",
          system_key: presetKey ?? undefined,
        });
        setSavedProfile(profile);
      } else if (mappingChanged(profile.mapping, mapping)) {
        await importIntelligenceApi.submitFeedback({
          profile_id: profile._id,
          before_mapping: profile.mapping,
          after_mapping: mapping,
          accepted: true,
        });
        profile = await importIntelligenceApi.updateProfile(profile._id, {
          name: profileName.trim() || profile.name,
          banco_label: bancoLabel.trim() || profile.banco_label,
          ...headerPayload,
          mapping,
        });
        setSavedProfile(profile);
      } else if (
        profileName.trim() !== profile.name ||
        bancoLabel.trim() !== profile.banco_label ||
        empresaNome.trim() !== (profile.empresa_nome ?? "") ||
        empresaCnpj.trim() !== (profile.empresa_cnpj ?? "") ||
        contaCorrente.trim() !== (profile.conta_corrente ?? "")
      ) {
        profile = await importIntelligenceApi.updateProfile(profile._id, {
          name: profileName.trim() || profile.name,
          banco_label: bancoLabel.trim() || profile.banco_label,
          ...headerPayload,
        });
        setSavedProfile(profile);
      }

      const suggestionAccepted =
        Boolean(mappingBefore) && mapping && !mappingChanged(mappingBefore!, mapping);

      return importIntelligenceApi.import(file, profile._id, {
        label: profileName.trim() || undefined,
        mapping,
        mappingBefore: mappingBefore ?? undefined,
        suggestionAcceptedWithoutEdit: suggestionAccepted,
      });
    },
  });

  const headers = analysis?.detected_headers ?? [];
  const isPdf = Boolean(file?.name.toLowerCase().endsWith(".pdf"));
  const isNotaJson = analysis?.detected_json_kind === "nota_fiscal";
  const canImport =
    Boolean(file && mapping && !isPdf && !isNotaJson && (analysis?.total_rows_parsed ?? 0) > 0);

  const updateProfileMutation = useMutation({
    mutationFn: async () => {
      if (!editProfile) throw new Error("Perfil não selecionado");
      return importIntelligenceApi.updateProfile(editProfile._id, {
        name: editName.trim(),
        banco_label: editBancoLabel.trim(),
        empresa_nome: editEmpresaNome.trim() || undefined,
        empresa_cnpj: editEmpresaCnpj.trim() || undefined,
        conta_corrente: editConta.trim() || undefined,
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["import-profiles"] });
      toast("Banco atualizado", "success");
      setEditProfile(null);
    },
    onError: (err) => {
      toast(importIntelligenceApi.getError(err, "Não foi possível atualizar o banco"), "error");
    },
  });

  const deleteProfileMutation = useMutation({
    mutationFn: (profileId: string) => importIntelligenceApi.deleteProfile(profileId),
    onSuccess: (_data, profileId) => {
      qc.invalidateQueries({ queryKey: ["import-profiles"] });
      toast("Banco removido", "success");
      setDeleteProfileTarget(null);
      if (selectedProfile?._id === profileId) setSelectedProfile(null);
      if (savedProfile?._id === profileId) setSavedProfile(null);
    },
    onError: (err) => {
      toast(importIntelligenceApi.getError(err, "Não foi possível remover o banco"), "error");
    },
  });

  const openEditProfile = (profile: ImportProfile) => {
    setEditProfile(profile);
    const fields = applyProfileHeaderFields(profile);
    setEditName(fields.profileName);
    setEditBancoLabel(fields.bancoLabel);
    setEditEmpresaNome(fields.empresaNome);
    setEditEmpresaCnpj(fields.empresaCnpj);
    setEditConta(fields.contaCorrente);
  };

  const refreshPreview = async (nextMapping: ImportProfileMapping) => {
    if (!file) return;
    setRefreshingPreview(true);
    try {
      const preview = await importIntelligenceApi.preview(file, nextMapping);
      setAnalysis((prev) =>
        prev
          ? {
              ...prev,
              sample_normalized: preview.sample_normalized ?? prev.sample_normalized,
              total_rows_parsed: preview.rows_ok,
            }
          : prev,
      );
    } catch (err) {
      toast(importIntelligenceApi.getError(err, "Falha ao atualizar prévia"), "error");
    } finally {
      setRefreshingPreview(false);
    }
  };

  const onFile = async (f: File) => {
    setFile(f);
    setResult(null);
    setSavedProfile(null);

    try {
      const res = await analyzeMutation.mutateAsync({
        f,
        preset: presetKey ?? undefined,
      });

      if (res.detected_json_kind === "nota_fiscal") {
        setAnalysis(res);
        setMapping(null);
        setStep(2);
        return;
      }

      if (mode === "profile" && selectedProfile) {
        const preview = await importIntelligenceApi.preview(f, selectedProfile.mapping);
        setAnalysis({
          ...res,
          mapping: selectedProfile.mapping,
          sample_normalized: preview.sample_normalized ?? res.sample_normalized,
          total_rows_parsed: preview.rows_ok,
        });
        setMapping(selectedProfile.mapping);
        originalMappingRef.current = selectedProfile.mapping;
        const fields = applyProfileHeaderFields(selectedProfile);
        setBancoLabel(fields.bancoLabel);
        setProfileName(fields.profileName);
        setEmpresaNome(fields.empresaNome);
        setEmpresaCnpj(fields.empresaCnpj);
        setContaCorrente(fields.contaCorrente);
        setStep(2);
        return;
      }

      setAnalysis(res);
      setMapping(res.mapping);
      originalMappingRef.current = res.mapping;
      setBancoLabel(res.banco_label_suggested || "");
      setProfileName(res.banco_label_suggested || f.name.replace(/\.(csv|json)$/i, ""));
      const defaults = applyFluxoDefaultHeaderFields();
      const meta = res.file_metadata;
      setEmpresaNome(meta?.empresa_nome?.trim() || defaults.empresaNome);
      setEmpresaCnpj(meta?.empresa_cnpj?.trim() || defaults.empresaCnpj);
      setContaCorrente(meta?.conta_corrente?.trim() || defaults.contaCorrente);
      setStep(2);
    } catch (err) {
      toast(importIntelligenceApi.getError(err, "Falha ao analisar arquivo"), "error");
    }
  };

  const onImport = async () => {
    if (!file || !mapping) return;
    try {
      const preview = await importIntelligenceApi.preview(file, mapping);
      if (!preview.valid && preview.rows_ok === 0) {
        toast(preview.errors[0] || "Não encontramos lançamentos válidos no arquivo", "error");
        return;
      }
      const res = await importMutation.mutateAsync();
      setResult(res);
      setStep(4);
      qc.invalidateQueries({ queryKey: ["arquivos"] });
      qc.invalidateQueries({ queryKey: ["home"] });
      qc.invalidateQueries({ queryKey: ["recebimentos"] });
      qc.invalidateQueries({ queryKey: ["import-profiles"] });
      toast("Extrato importado", "success");
    } catch (err) {
      toast(importIntelligenceApi.getError(err, "Falha ao importar"), "error");
    }
  };

  const updateColumn = async (field: keyof ImportProfileMapping["columns"], value: string) => {
    if (!mapping) return;
    const nextMapping = {
      ...mapping,
      columns: { ...mapping.columns, [field]: value || null },
    };
    setMapping(nextMapping);
    await refreshPreview(nextMapping);
  };

  return (
    <WizardTemplate
      title="Importar extrato bancário"
      description="Envie o CSV do extrato — bancos já configurados aparecem como atalho"
      steps={STEPS}
      currentStep={step}
      taskGuide={<TaskGuide goal={TASK.goal} steps={TASK.steps} minutes={TASK.minutes} currentStep={step} />}
      stepHint={<StepHint>{STEP_HINTS[step]}</StepHint>}
    >
      {step === 0 && (
        <div className="stack-gap">
          <ChoiceCardGrid>
            {userProfiles.map((profile) => (
              <ProfileChoiceCard
                key={profile._id}
                title={profile.name}
                description={profileCardDescription(profile)}
                onSelect={() => {
                  setMode("profile");
                  setPresetKey(null);
                  setSelectedProfile(profile);
                  const fields = applyProfileHeaderFields(profile);
                  setBancoLabel(fields.bancoLabel);
                  setProfileName(fields.profileName);
                  setEmpresaNome(fields.empresaNome);
                  setEmpresaCnpj(fields.empresaCnpj);
                  setContaCorrente(fields.contaCorrente);
                  setStep(1);
                }}
                onEdit={() => openEditProfile(profile)}
                onDelete={() => setDeleteProfileTarget(profile)}
              />
            ))}
            <ChoiceCard
              title="Novo banco"
              description="Primeira vez com este extrato — o sistema detecta o formato automaticamente"
              onClick={() => {
                setMode("new");
                setPresetKey(null);
                setSelectedProfile(null);
                setBancoLabel("");
                setProfileName("");
                setEmpresaNome("");
                setEmpresaCnpj("");
                setContaCorrente("");
                setStep(1);
              }}
            />
          </ChoiceCardGrid>
          {profilesQuery.isLoading && (
            <Typography variant="caption" tone="muted">
              Carregando bancos salvos…
            </Typography>
          )}
          {!profilesQuery.isLoading && userProfiles.length === 0 && (
            <Typography variant="body" tone="muted">
              Após a primeira importação, o banco configurado aparecerá aqui para reutilizar nas próximas vezes.
            </Typography>
          )}
        </div>
      )}

      {step === 1 && (
        <div className="stack-gap">
          {mode === "profile" && selectedProfile && (
            <Typography variant="body">
              Banco: <strong>{selectedProfile.name}</strong> ({selectedProfile.banco_label})
            </Typography>
          )}
          {mode === "new" && <ImportFormatExample />}
          <UploadArea
            accept=".csv,.json,.pdf,text/csv,application/json,application/pdf"
            onFile={onFile}
            disabled={analyzeMutation.isPending}
            label={
              analyzeMutation.isPending ? "Lendo seu arquivo…" : "Arraste o extrato aqui ou toque para escolher"
            }
          />
          <Button variant="outline" onClick={() => setStep(0)}>
            Voltar
          </Button>
        </div>
      )}

      {step === 2 && analysis && (
        <Card>
          <CardBody className="stack-gap">
            {isNotaJson ? (
              <>
                <Typography variant="subtitle">Este arquivo é de notas fiscais</Typography>
                {analysis.gaps.map((gap) => (
                  <Typography key={gap.field} variant="body">
                    {gap.message}
                  </Typography>
                ))}
                <Button asChild>
                  <Link to={ROUTES.arquivosNotas}>Ir para envio de notas</Link>
                </Button>
                <Button variant="outline" onClick={() => setStep(1)}>
                  Voltar
                </Button>
              </>
            ) : mapping ? (
              <>
                <ImportReadingPreview
                  analysis={analysis}
                  mapping={mapping}
                  headers={headers}
                  onMappingChange={updateColumn}
                />
                {refreshingPreview && (
                  <Typography variant="caption" tone="muted">
                    Atualizando prévia…
                  </Typography>
                )}
                {analysis.parse_errors.length > 0 && <ErrorState message={analysis.parse_errors[0]} />}
                {isPdf && (
                  <Typography variant="body" tone="muted">
                    Arquivos PDF servem para configurar o banco. Para importar, exporte um CSV do internet banking.
                  </Typography>
                )}
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => setStep(1)}>
                    Voltar
                  </Button>
                  <Button
                    onClick={() => setStep(3)}
                    disabled={!mapping.columns.data || !mapping.columns.valor || isPdf || refreshingPreview}
                  >
                    Está correto, continuar
                  </Button>
                </div>
              </>
            ) : null}
          </CardBody>
        </Card>
      )}

      {step === 3 && mapping && (
        <Card>
          <CardBody className="stack-gap">
            <Typography variant="subtitle">Último passo antes de importar</Typography>
            <Typography variant="body" tone="muted">
              {analysis?.total_rows_parsed ?? 0} lançamento
              {(analysis?.total_rows_parsed ?? 0) === 1 ? "" : "s"} serão adicionados ao sistema.
            </Typography>

            <div className="rounded-xl border border-border bg-muted/20 p-4 stack-gap">
              <Typography variant="subtitle">Cabeçalho da planilha de fluxo de caixa</Typography>
              <Typography variant="caption" tone="muted">
                Esses dados aparecem no topo de cada exportação deste banco.
              </Typography>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Label htmlFor="empresa-nome">Empresa</Label>
                  <Input
                    id="empresa-nome"
                    value={empresaNome}
                    onChange={(e) => setEmpresaNome(e.target.value)}
                    placeholder="Ex.: FECHO AI"
                  />
                </div>
                <div>
                  <Label htmlFor="empresa-cnpj">CNPJ</Label>
                  <Input
                    id="empresa-cnpj"
                    value={empresaCnpj}
                    onChange={(e) => setEmpresaCnpj(e.target.value)}
                    placeholder="00.000.000/0000-00"
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="banco-label">Banco</Label>
                <Input
                  id="banco-label"
                  value={bancoLabel}
                  onChange={(e) => setBancoLabel(e.target.value)}
                  placeholder="Ex.: Nubank Cartão de Crédito"
                />
              </div>
              <div>
                <Label htmlFor="conta-corrente">Conta corrente (opcional)</Label>
                <Input
                  id="conta-corrente"
                  value={contaCorrente}
                  onChange={(e) => setContaCorrente(e.target.value)}
                  placeholder="Ex.: 12345-6"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="profile-name">Nome do card</Label>
              <Input
                id="profile-name"
                value={profileName}
                onChange={(e) => setProfileName(e.target.value)}
                placeholder="Ex.: Nubank Cartão"
              />
              <Typography variant="caption" tone="muted" className="mt-1 block">
                Na próxima vez, escolha o card do banco salvo para não precisar configurar de novo.
              </Typography>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setStep(2)}>
                Voltar
              </Button>
              <Button
                disabled={!bancoLabel.trim() || importMutation.isPending || !canImport}
                loading={importMutation.isPending}
                onClick={onImport}
              >
                Importar {analysis?.total_rows_parsed ?? 0} lançamento
                {(analysis?.total_rows_parsed ?? 0) === 1 ? "" : "s"}
              </Button>
            </div>
          </CardBody>
        </Card>
      )}

      {step === 4 && result && (
        <Card>
          <CardBody className="stack-gap">
            <Typography variant="subtitle" className="text-success">
              Extrato importado com sucesso
            </Typography>
            <Typography variant="body">
              {result.conciliado_auto ?? 0} vinculados automaticamente · {result.pendente_vinculo ?? 0} para você
              confirmar · {result.sem_match ?? 0} sem nota correspondente
            </Typography>
            <NextStepBanner {...journeyNextSteps.afterExtratoImport} />
            <Button variant="outline" asChild>
              <Link to={ROUTES.arquivosHistorico}>Ver histórico</Link>
            </Button>
          </CardBody>
        </Card>
      )}

      <Modal
        open={Boolean(editProfile)}
        onOpenChange={(open) => !open && setEditProfile(null)}
        title="Editar banco salvo"
        description="Altere o card e o cabeçalho usado na planilha de fluxo de caixa."
        footer={
          <>
            <Button variant="outline" onClick={() => setEditProfile(null)} disabled={updateProfileMutation.isPending}>
              Cancelar
            </Button>
            <Button
              loading={updateProfileMutation.isPending}
              disabled={!editName.trim() || !editBancoLabel.trim()}
              onClick={() => void updateProfileMutation.mutate()}
            >
              Salvar
            </Button>
          </>
        }
      >
        <div className="stack-gap">
          <div>
            <Label htmlFor="edit-profile-name">Nome do card</Label>
            <Input id="edit-profile-name" value={editName} onChange={(e) => setEditName(e.target.value)} />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="edit-empresa-nome">Empresa</Label>
              <Input
                id="edit-empresa-nome"
                value={editEmpresaNome}
                onChange={(e) => setEditEmpresaNome(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="edit-empresa-cnpj">CNPJ</Label>
              <Input
                id="edit-empresa-cnpj"
                value={editEmpresaCnpj}
                onChange={(e) => setEditEmpresaCnpj(e.target.value)}
              />
            </div>
          </div>
          <div>
            <Label htmlFor="edit-banco-label">Banco</Label>
            <Input id="edit-banco-label" value={editBancoLabel} onChange={(e) => setEditBancoLabel(e.target.value)} />
          </div>
          <div>
            <Label htmlFor="edit-conta">Conta corrente (opcional)</Label>
            <Input id="edit-conta" value={editConta} onChange={(e) => setEditConta(e.target.value)} />
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        open={Boolean(deleteProfileTarget)}
        onOpenChange={(open) => !open && setDeleteProfileTarget(null)}
        title="Excluir banco salvo?"
        description={
          deleteProfileTarget
            ? `“${deleteProfileTarget.name}” será removido da lista. Importações anteriores não são apagadas.`
            : undefined
        }
        confirmLabel="Excluir"
        variant="danger"
        loading={deleteProfileMutation.isPending}
        onConfirm={async () => {
          if (!deleteProfileTarget) return;
          await deleteProfileMutation.mutateAsync(deleteProfileTarget._id);
        }}
      />
    </WizardTemplate>
  );
}
