import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { motion } from "framer-motion";
import { ArrowLeft, Download, Pencil, Plus, Trash2 } from "lucide-react";
import { Navigate } from "react-router-dom";
import { PageHeader, Callout, ErrorState, PrefetchLink } from "@/design-system/molecules";
import { Badge, Button, Input, Label, Skeleton, Typography } from "@/design-system/atoms";
import { Card, CardBody, Modal } from "@/design-system/organisms";
import { useToast } from "@/app/toast-provider";
import { useAuth } from "@/features/auth/context";
import { isTenantOwner } from "@/features/auth/types";
import { ROUTES } from "@/lib/constants";
import { getApiErrorMessage } from "@/lib/api-client";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import {
  useCreateTomadorMutation,
  useDeleteTomadorMutation,
  useImportarTomadoresMutation,
  useTomadoresQuery,
  useUpdateTomadorMutation,
} from "../hooks";
import { parseTomadorPayload, tomadorSchema, tomadorToFormValues, type TomadorFormData } from "../schema";
import type { Tomador } from "../types";

function TomadorFormFields({
  register,
  errors,
}: {
  register: ReturnType<typeof useForm<TomadorFormData>>["register"];
  errors: ReturnType<typeof useForm<TomadorFormData>>["formState"]["errors"];
}) {
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="tomador-nome">Nome / razão social</Label>
        <Input id="tomador-nome" {...register("nome")} placeholder="Ex.: Luana Barreto Kaderabek" />
        {errors.nome ? <Typography variant="caption" tone="danger">{errors.nome.message}</Typography> : null}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="tomador-documento">CPF ou CNPJ</Label>
          <Input id="tomador-documento" {...register("documento")} placeholder="Somente números" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="tomador-email">E-mail</Label>
          <Input id="tomador-email" type="email" {...register("email")} />
          {errors.email ? <Typography variant="caption" tone="danger">{errors.email.message}</Typography> : null}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="tomador-servico">Código de serviço padrão</Label>
          <Input id="tomador-servico" {...register("codigo_servico_padrao")} placeholder="Ex.: 05762" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="tomador-aliquota">Alíquota ISS (%)</Label>
          <Input id="tomador-aliquota" {...register("aliquota_iss_padrao")} placeholder="Ex.: 2,9" />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="tomador-discriminacao">Discriminação padrão</Label>
        <Input id="tomador-discriminacao" {...register("discriminacao_padrao")} />
      </div>

      <div className="space-y-2">
        <Label htmlFor="tomador-aliases">Apelidos no extrato</Label>
        <Input
          id="tomador-aliases"
          {...register("aliases_pagamento")}
          placeholder="Nomes que aparecem no Pix ou Asaas, separados por vírgula"
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="tomador-cidade">Cidade</Label>
          <Input id="tomador-cidade" {...register("endereco_cidade")} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="tomador-uf">UF</Label>
          <Input id="tomador-uf" maxLength={2} {...register("endereco_uf")} />
        </div>
      </div>
    </div>
  );
}

export default function TomadoresPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const isOwner = isTenantOwner(user);
  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Tomador | null>(null);
  const debouncedSearch = useDebouncedValue(search, 300);

  const tomadoresQuery = useTomadoresQuery(
    { q: debouncedSearch || undefined, limit: 100 },
    isOwner,
  );
  const createTomador = useCreateTomadorMutation();
  const updateTomador = useUpdateTomadorMutation();
  const deleteTomador = useDeleteTomadorMutation();
  const importarTomadores = useImportarTomadoresMutation();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<TomadorFormData>({
    resolver: zodResolver(tomadorSchema),
    defaultValues: tomadorToFormValues(),
  });

  useEffect(() => {
    reset(tomadorToFormValues(editing ?? undefined));
  }, [editing, reset]);

  if (!isOwner) {
    return <Navigate to={ROUTES.home} replace />;
  }

  const openCreate = () => {
    setEditing(null);
    setModalOpen(true);
  };

  const openEdit = (tomador: Tomador) => {
    setEditing(tomador);
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditing(null);
    reset(tomadorToFormValues());
  };

  const onSubmit = async (data: TomadorFormData) => {
    const payload = parseTomadorPayload(data);
    try {
      if (editing) {
        await updateTomador.mutateAsync({ id: editing._id, payload });
        toast("Tomador atualizado", "success");
      } else {
        await createTomador.mutateAsync(payload);
        toast("Tomador cadastrado", "success");
      }
      closeModal();
    } catch (error) {
      toast(getApiErrorMessage(error, "Não foi possível salvar o tomador"), "error");
    }
  };

  const handleDelete = async (tomador: Tomador) => {
    if (!window.confirm(`Remover ${tomador.nome} da lista de tomadores?`)) return;
    try {
      await deleteTomador.mutateAsync(tomador._id);
      toast("Tomador removido", "success");
    } catch (error) {
      toast(getApiErrorMessage(error, "Não foi possível remover o tomador"), "error");
    }
  };

  const handleImport = async () => {
    try {
      const result = await importarTomadores.mutateAsync();
      toast(
        `Importação concluída: ${result.created} novo(s), ${result.skipped} já existente(s)`,
        "success",
      );
    } catch (error) {
      toast(getApiErrorMessage(error, "Não foi possível importar tomadores das notas"), "error");
    }
  };

  const items = tomadoresQuery.data?.items ?? [];

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mx-auto max-w-5xl space-y-6">
      <PrefetchLink
        to={ROUTES.configuracoes}
        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden />
        Voltar para configurações
      </PrefetchLink>

      <PageHeader
        title="Tomadores"
        description="Cadastre clientes para emissão de notas fiscais e identificação de pagamentos"
        actions={
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={handleImport}
              loading={importarTomadores.isPending}
            >
              <Download className="h-4 w-4" aria-hidden />
              Importar das notas
            </Button>
            <Button type="button" onClick={openCreate}>
              <Plus className="h-4 w-4" aria-hidden />
              Novo tomador
            </Button>
          </div>
        }
      />

      <Callout variant="info" title="Apelidos ajudam na conciliação">
        Cadastre os nomes que aparecem no extrato bancário como apelidos. Isso prepara a identificação
        automática quando um pagamento chegar sem nota correspondente.
      </Callout>

      <div className="max-w-md">
        <Input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Buscar por nome, documento ou e-mail"
          aria-label="Buscar tomadores"
        />
      </div>

      {tomadoresQuery.isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={index} className="h-20 w-full rounded-xl" />
          ))}
        </div>
      ) : tomadoresQuery.isError ? (
        <ErrorState message="Não foi possível carregar os tomadores." onRetry={() => tomadoresQuery.refetch()} />
      ) : items.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-surface-sunken px-6 py-12 text-center">
          <Typography variant="title">Nenhum tomador cadastrado</Typography>
          <Typography variant="body" tone="muted" className="mt-2 max-w-md">
            Importe a partir das notas já enviadas ou cadastre manualmente o primeiro cliente.
          </Typography>
          <div className="mt-4 flex flex-wrap justify-center gap-2">
            <Button variant="outline" onClick={handleImport} loading={importarTomadores.isPending}>
              Importar das notas
            </Button>
            <Button onClick={openCreate}>Cadastrar tomador</Button>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((tomador) => (
            <Card key={tomador._id}>
              <CardBody className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0 space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <Typography variant="subtitle">{tomador.nome}</Typography>
                    {tomador.origem === "importacao_nf" ? (
                      <Badge variant="secondary">Importado</Badge>
                    ) : null}
                  </div>
                  <Typography variant="caption" tone="muted">
                    {[tomador.documento, tomador.email, tomador.codigo_servico_padrao]
                      .filter(Boolean)
                      .join(" · ") || "Sem documento ou serviço padrão"}
                  </Typography>
                  {tomador.aliases_pagamento.length > 0 ? (
                    <Typography variant="caption" tone="muted">
                      Apelidos: {tomador.aliases_pagamento.join(", ")}
                    </Typography>
                  ) : null}
                </div>
                <div className="flex shrink-0 gap-2">
                  <Button type="button" variant="outline" size="sm" onClick={() => openEdit(tomador)}>
                    <Pencil className="h-4 w-4" aria-hidden />
                    Editar
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => handleDelete(tomador)}
                    loading={deleteTomador.isPending}
                  >
                    <Trash2 className="h-4 w-4" aria-hidden />
                    Remover
                  </Button>
                </div>
              </CardBody>
            </Card>
          ))}
        </div>
      )}

      <Modal
        open={modalOpen}
        onOpenChange={(open) => {
          if (!open) closeModal();
          else setModalOpen(true);
        }}
        title={editing ? "Editar tomador" : "Novo tomador"}
        description="Dados usados para emissão de NF e identificação de pagamentos"
      >
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <TomadorFormFields register={register} errors={errors} />
          <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
            <Button type="button" variant="outline" onClick={closeModal}>
              Cancelar
            </Button>
            <Button
              type="submit"
              loading={isSubmitting || createTomador.isPending || updateTomador.isPending}
            >
              {editing ? "Salvar alterações" : "Cadastrar tomador"}
            </Button>
          </div>
        </form>
      </Modal>
    </motion.div>
  );
}
