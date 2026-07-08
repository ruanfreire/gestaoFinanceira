import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, FileText } from "lucide-react";
import { Navigate } from "react-router-dom";
import { Callout, ErrorState, PageHeader, PrefetchLink } from "@/design-system/molecules";
import { Button, Label, Skeleton, Typography } from "@/design-system/atoms";
import { Card, CardBody } from "@/design-system/organisms";
import { useToast } from "@/app/toast-provider";
import { useAuth } from "@/features/auth/context";
import { isTenantOwner } from "@/features/auth/types";
import { ROUTES } from "@/lib/constants";
import { getApiErrorMessage } from "@/lib/api-client";
import { useOrgEmissaoConfig, useUpdateOrgEmissaoConfig } from "../hooks";

const PREFEITURA_OPTIONS = [{ value: "sp", label: "Prefeitura de São Paulo (NFS-e)" }] as const;

export default function EmissaoNfConfigPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const configQuery = useOrgEmissaoConfig();
  const updateMutation = useUpdateOrgEmissaoConfig();

  const [prefeitura, setPrefeitura] = useState("");
  const [habilitada, setHabilitada] = useState(false);

  const isOwner = isTenantOwner(user);
  const config = configQuery.data;

  useEffect(() => {
    if (!config) return;
    setPrefeitura(config.prefeitura_codigo ?? "");
    setHabilitada(config.emissao_nf_habilitada);
  }, [config]);

  if (!isOwner) {
    return <Navigate to={ROUTES.home} replace />;
  }

  const onSave = async () => {
    if (habilitada && !prefeitura) {
      toast("Selecione a prefeitura antes de ativar a emissão", "error");
      return;
    }
    try {
      await updateMutation.mutateAsync({
        emissao_nf_habilitada: habilitada,
        prefeitura_codigo: prefeitura || null,
      });
      toast("Configuração de emissão salva", "success");
    } catch (error) {
      toast(getApiErrorMessage(error, "Não foi possível salvar"), "error");
    }
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mx-auto max-w-2xl space-y-6">
      <PrefetchLink
        to={ROUTES.configuracoes}
        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden />
        Voltar para configurações
      </PrefetchLink>

      <PageHeader
        title="Emissão NFS-e"
        description="Emissão fiscal via APIs oficiais das prefeituras — independente da integração Honest"
      />

      {configQuery.isLoading ? (
        <Skeleton className="h-64 w-full rounded-xl" />
      ) : configQuery.isError ? (
        <ErrorState title="Não foi possível carregar" onRetry={() => configQuery.refetch()} />
      ) : (
        <>
          {!config?.org_profile_ready ? (
            <Callout variant="warning" title="CNPJ obrigatório">
              Cadastre o CNPJ em{" "}
              <PrefetchLink to={ROUTES.perfil} className="font-medium underline">
                Perfil da organização
              </PrefetchLink>{" "}
              antes de emitir notas.
            </Callout>
          ) : null}

          <Callout variant="info" title="Canal de emissão">
            Novas notas são enviadas diretamente à <strong>API NFS-e da prefeitura</strong> selecionada. A Honest
            continua responsável apenas por <strong>importar</strong> notas já emitidas.
          </Callout>

          <Card>
            <CardBody className="space-y-5">
              <div className="flex items-start gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <FileText className="h-5 w-5" aria-hidden />
                </span>
                <div>
                  <Typography variant="subtitle">Prefeitura emissora</Typography>
                  <Typography variant="caption" tone="muted" className="mt-1 block">
                    Escolha o município onde a NFS-e será transmitida.
                  </Typography>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="prefeitura">Município</Label>
                <select
                  id="prefeitura"
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
                  value={prefeitura}
                  onChange={(e) => setPrefeitura(e.target.value)}
                >
                  <option value="">Selecione…</option>
                  {PREFEITURA_OPTIONS.map((item) => (
                    <option key={item.value} value={item.value}>
                      {item.label}
                    </option>
                  ))}
                </select>
              </div>

              <label className="flex items-start gap-3">
                <input
                  type="checkbox"
                  className="mt-1 h-4 w-4 rounded border-border"
                  checked={habilitada}
                  onChange={(e) => setHabilitada(e.target.checked)}
                />
                <span className="text-sm">
                  <span className="font-medium">Emitir NFS-e automaticamente</span>
                  <span className="mt-1 block text-muted-foreground">
                    Ao confirmar um pagamento sem nota, o sistema transmite à prefeitura. Desligado grava nota local
                    com status pendente de emissão manual.
                  </span>
                </span>
              </label>

              <Button onClick={onSave} loading={updateMutation.isPending}>
                Salvar
              </Button>
            </CardBody>
          </Card>
        </>
      )}
    </motion.div>
  );
}
