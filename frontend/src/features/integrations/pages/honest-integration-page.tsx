import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, Building2, Link2, RefreshCw, Save } from "lucide-react";
import { Navigate } from "react-router-dom";
import { PageHeader, Callout, ErrorState, PrefetchLink } from "@/design-system/molecules";
import { Button, Input, Label, Skeleton, Typography } from "@/design-system/atoms";
import { Card, CardBody } from "@/design-system/organisms";
import { useToast } from "@/app/toast-provider";
import { useAuth } from "@/features/auth/context";
import { isTenantOwner } from "@/features/auth/types";
import { ROUTES } from "@/lib/constants";
import { formatDateTime } from "@/lib/format";
import { getApiErrorMessage } from "@/lib/api-client";
import {
  useConnectHonestIntegration,
  useHonestIntegration,
  useSyncHonestIntegration,
  useUpdateHonestIntegration,
} from "../hooks";

const HONEST_PORTAL_URL = "https://honest.com.br";

export default function HonestIntegrationPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const honestQuery = useHonestIntegration();
  const connectMutation = useConnectHonestIntegration();
  const updateMutation = useUpdateHonestIntegration();
  const syncMutation = useSyncHonestIntegration();

  const [apiLogin, setApiLogin] = useState("");
  const [apiPassword, setApiPassword] = useState("");

  const isOwner = isTenantOwner(user);
  const config = honestQuery.data;

  useEffect(() => {
    if (!config) return;
    setApiLogin(config.api_login ?? "");
  }, [config]);

  if (!isOwner) {
    return <Navigate to={ROUTES.home} replace />;
  }

  const onSave = async () => {
    if (!apiLogin.trim()) {
      toast("Informe o e-mail de acesso à Honest", "error");
      return;
    }
    if (!apiPassword.trim() && !config?.has_credentials) {
      toast("Informe a senha da Honest", "error");
      return;
    }
    try {
      await updateMutation.mutateAsync({
        api_login: apiLogin.trim(),
        ...(apiPassword.trim() ? { api_password: apiPassword } : {}),
        api_base_url: HONEST_PORTAL_URL,
      });
      setApiPassword("");
      toast("Dados salvos", "success");
    } catch (error) {
      toast(getApiErrorMessage(error, "Não foi possível salvar"), "error");
    }
  };

  const onConnect = async () => {
    if (!apiLogin.trim()) {
      toast("Informe o e-mail de acesso à Honest", "error");
      return;
    }
    if (!apiPassword.trim()) {
      toast("Informe a senha para conectar (use a mesma do portal Honest)", "error");
      return;
    }
    if (!config?.org_profile_ready) {
      toast("Cadastre o CNPJ no perfil da organização antes de conectar", "error");
      return;
    }
    try {
      await connectMutation.mutateAsync({
        api_login: apiLogin.trim(),
        api_password: apiPassword,
        api_base_url: HONEST_PORTAL_URL,
      });
      setApiPassword("");
      toast("Conectado à Honest. A busca automática de novas notas está ativa.", "success");
    } catch (error) {
      toast(getApiErrorMessage(error, "Não foi possível conectar"), "error");
    }
  };

  const onSync = async () => {
    try {
      const result = await syncMutation.mutateAsync();
      const imported = result.last_sync_stats?.imported ?? 0;
      const ignored = result.last_sync_stats?.ignored ?? 0;
      const vinculadas = result.last_sync_stats?.vinculadas ?? 0;
      if (imported === 0 && ignored === 0 && vinculadas === 0) {
        toast("Sincronização concluída — nenhuma nota nova na Honest", "success");
      } else {
        const parts = [];
        if (imported > 0 || ignored > 0) {
          parts.push(
            `${imported} nota(s) nova(s)${ignored > 0 ? `, ${ignored} já existente(s)` : ""}`,
          );
        }
        if (vinculadas > 0) {
          parts.push(`${vinculadas} nota(s) vinculada(s) a recebimentos`);
        }
        toast(`Sincronização concluída: ${parts.join(" · ")}`, "success");
      }
    } catch (error) {
      toast(getApiErrorMessage(error, "Falha na sincronização"), "error");
    }
  };

  const busy =
    connectMutation.isPending || updateMutation.isPending || syncMutation.isPending || honestQuery.isFetching;

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mx-auto max-w-2xl space-y-6">
      <PrefetchLink
        to={ROUTES.integracoes}
        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden />
        Voltar para integrações
      </PrefetchLink>

      <PageHeader
        title="Honest"
        description="Importe notas fiscais da Honest automaticamente. Só adicionamos notas novas — nada é alterado no sistema."
      />

      {honestQuery.isLoading ? (
        <Skeleton className="h-72 w-full rounded-xl" />
      ) : honestQuery.isError ? (
        <ErrorState title="Não foi possível carregar a integração" onRetry={() => honestQuery.refetch()} />
      ) : (
        <>
          {!config?.org_profile_ready ? (
            <Callout variant="warning" title="Antes de começar">
              Cadastre a razão social e o CNPJ da empresa em{" "}
              <PrefetchLink to={ROUTES.perfil} className="font-medium underline">
                Perfil da organização
              </PrefetchLink>
              . Usamos o CNPJ para encontrar a empresa certa na Honest.
            </Callout>
          ) : (
            <Callout variant="info" title="Empresa">
              <Typography variant="body">
                {config.empresa_nome ?? "Organização"}
                {config.empresa_cnpj ? ` · CNPJ ${config.empresa_cnpj}` : ""}
              </Typography>
              <Button variant="outline" size="sm" className="mt-3" asChild>
                <PrefetchLink to={ROUTES.perfil}>
                  <Building2 className="mr-2 h-4 w-4" />
                  Editar perfil
                </PrefetchLink>
              </Button>
            </Callout>
          )}

          <Card>
            <CardBody className="space-y-5">
              <div>
                <Typography variant="subtitle">Acesso ao portal Honest</Typography>
                <Typography variant="caption" tone="muted" className="mt-1 block">
                  Use o mesmo e-mail e senha da{" "}
                  <a
                    href="https://honest.com.br/u/acesso"
                    target="_blank"
                    rel="noreferrer"
                    className="underline"
                  >
                    Área do Cliente Honest
                  </a>
                  .
                </Typography>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="honest-login">E-mail</Label>
                  <Input
                    id="honest-login"
                    value={apiLogin}
                    onChange={(e) => setApiLogin(e.target.value)}
                    placeholder="seu@email.com"
                    autoComplete="username"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="honest-password">Senha</Label>
                  <Input
                    id="honest-password"
                    type="password"
                    value={apiPassword}
                    onChange={(e) => setApiPassword(e.target.value)}
                    placeholder={config?.has_credentials ? "••••••••" : "Sua senha"}
                    autoComplete="current-password"
                  />
                </div>
              </div>

              <div className="flex flex-wrap gap-3 border-t border-border pt-5">
                <Button variant="outline" onClick={onSave} loading={updateMutation.isPending} disabled={busy}>
                  <Save className="mr-2 h-4 w-4" />
                  Salvar dados
                </Button>
                <Button onClick={onConnect} loading={connectMutation.isPending} disabled={busy}>
                  Conectar
                </Button>
                <Button
                  variant="secondary"
                  onClick={onSync}
                  loading={syncMutation.isPending}
                  disabled={busy || !config?.has_credentials}
                >
                  <RefreshCw className={`mr-2 h-4 w-4 ${syncMutation.isPending ? "animate-spin" : ""}`} />
                  Sincronizar
                </Button>
              </div>

              {config?.has_credentials ? (
                <Typography variant="caption" tone="muted">
                  {config.is_connected
                    ? "Conectado. O sistema verifica novas notas automaticamente em segundo plano."
                    : "Dados salvos. Clique em Conectar para validar o acesso."}
                  {config.auto_sync_enabled ? " Busca automática ativa." : ""}
                </Typography>
              ) : null}
            </CardBody>
          </Card>

          {config?.last_sync_at ? (
            <Callout
              variant={config.last_sync_status === "failed" ? "warning" : "success"}
              title={`Última sincronização${config.last_sync_trigger === "worker" ? " (automática)" : ""}`}
            >
              <Typography variant="body">
                {formatDateTime(config.last_sync_at)}
                {config.last_sync_stats
                  ? ` · ${config.last_sync_stats.total_faturas ?? 0} na Honest · ${config.last_sync_stats.imported} nova(s) · ${config.last_sync_stats.ignored} já existente(s)${
                      (config.last_sync_stats.vinculadas ?? 0) > 0
                        ? ` · ${config.last_sync_stats.vinculadas} vinculada(s)`
                        : ""
                    }`
                  : ""}
              </Typography>
              {config.last_sync_error ? (
                <Typography variant="caption" tone="muted" className="mt-2 block">
                  {config.last_sync_error}
                </Typography>
              ) : null}
              {config.last_sync_stats?.importacao_id &&
              (config.last_sync_stats.total_faturas ?? 0) > 0 ? (
                <Button variant="outline" size="sm" className="mt-3" asChild>
                  <PrefetchLink to={`${ROUTES.arquivosHistorico}?focus=${config.last_sync_stats.importacao_id}`}>
                    <Link2 className="mr-2 h-4 w-4" />
                    Ver importação
                  </PrefetchLink>
                </Button>
              ) : null}
            </Callout>
          ) : (
            <Callout variant="info" title="Como usar">
              1) Cadastre CNPJ no perfil · 2) Salve e-mail e senha · 3) Conectar · 4) Sincronizar quando quiser
            </Callout>
          )}

          <Card>
            <CardBody className="space-y-4">
              <div>
                <Typography variant="subtitle">Emissão de NF pelo sistema</Typography>
                <Typography variant="caption" tone="muted" className="mt-1 block">
                  Quando ativo, notas registradas a partir de pagamentos são enviadas à Honest. Desligado mantém
                  registro local com status pendente de emissão.
                </Typography>
              </div>
              <label className="flex items-center gap-3">
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded border-border"
                  checked={Boolean(config?.emissao_nf_habilitada)}
                  disabled={busy || !config?.has_credentials}
                  onChange={async (event) => {
                    try {
                      await updateMutation.mutateAsync({ emissao_nf_habilitada: event.target.checked });
                      toast(event.target.checked ? "Emissão via Honest ativada" : "Emissão via Honest desativada", "success");
                    } catch (error) {
                      toast(getApiErrorMessage(error, "Não foi possível atualizar a emissão"), "error");
                    }
                  }}
                />
                <span className="text-sm">Permitir emissão de NF pelo sistema</span>
              </label>
            </CardBody>
          </Card>
        </>
      )}
    </motion.div>
  );
}
