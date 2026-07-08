import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { motion } from "framer-motion";
import { Copy, Trash2, UserMinus, UserPlus } from "lucide-react";
import { Navigate } from "react-router-dom";
import { PageHeader, ErrorState, EmptyState } from "@/design-system/molecules";
import { Badge, Button, Input, Label, Skeleton, Typography } from "@/design-system/atoms";
import { useToast } from "@/app/toast-provider";
import { useAuth } from "@/features/auth/context";
import { isTenantOwner } from "@/features/auth/types";
import { ROUTES, USER_STATUS_LABELS } from "@/lib/constants";
import { formatDateTime } from "@/lib/format";
import { getApiErrorMessage } from "@/lib/api-client";
import {
  useCreateInvite,
  useOrgInvites,
  useOrgMembers,
  useRegenerateInviteLink,
  useRemoveMember,
  useRevokeInvite,
} from "../hooks";

const inviteSchema = z.object({
  email: z.string().email("E-mail inválido"),
  tenantRole: z.enum(["owner", "operator"]),
});

type InviteForm = z.infer<typeof inviteSchema>;

function MemberListSkeleton() {
  return (
    <ul className="space-y-2">
      {Array.from({ length: 3 }).map((_, index) => (
        <li key={index} className="rounded-lg border border-border px-3 py-3">
          <Skeleton className="h-4 w-40" />
          <Skeleton className="mt-2 h-3 w-56" />
        </li>
      ))}
    </ul>
  );
}

export default function EquipePage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const isOwner = isTenantOwner(user);
  const membersQuery = useOrgMembers(isOwner);
  const invitesQuery = useOrgInvites(isOwner);
  const createInvite = useCreateInvite();
  const revokeInvite = useRevokeInvite();
  const regenerateLink = useRegenerateInviteLink();
  const removeMember = useRemoveMember();
  const [lastInviteUrl, setLastInviteUrl] = useState<string | null>(null);
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [copyingInviteId, setCopyingInviteId] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<InviteForm>({
    resolver: zodResolver(inviteSchema),
    defaultValues: { tenantRole: "operator" },
  });

  if (!isOwner) {
    return <Navigate to={ROUTES.home} replace />;
  }

  const onSubmit = async (data: InviteForm) => {
    setInviteError(null);
    try {
      const result = await createInvite.mutateAsync(data);
      setLastInviteUrl(result.inviteUrl);
      reset({ email: "", tenantRole: data.tenantRole });
      toast(
        result.emailSent
          ? "Convite criado e e-mail enviado"
          : "Convite criado — copie o link se o e-mail não chegar",
        "success",
      );
    } catch (error: unknown) {
      setInviteError(getApiErrorMessage(error, "Não foi possível criar o convite"));
    }
  };

  const copyInvite = async (url: string, options?: { emailSent?: boolean }) => {
    await navigator.clipboard.writeText(url);
    toast(
      options?.emailSent ? "Link copiado e e-mail reenviado" : "Link copiado",
      "success",
    );
  };

  const copyPendingInvite = async (inviteId: string) => {
    setCopyingInviteId(inviteId);
    try {
      const result = await regenerateLink.mutateAsync(inviteId);
      await copyInvite(result.inviteUrl, { emailSent: result.emailSent });
    } catch (error: unknown) {
      toast(getApiErrorMessage(error, "Não foi possível gerar o link"), "error");
    } finally {
      setCopyingInviteId(null);
    }
  };

  const handleRemoveMember = async (memberId: string, memberName: string) => {
    if (!window.confirm(`Remover ${memberName} da equipe?`)) return;
    try {
      await removeMember.mutateAsync(memberId);
      toast("Membro removido", "success");
    } catch (error: unknown) {
      toast(getApiErrorMessage(error, "Não foi possível remover o membro"), "error");
    }
  };

  const members = membersQuery.data?.items ?? [];
  const invites = invitesQuery.data?.items ?? [];

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mx-auto max-w-4xl space-y-6">
      <PageHeader
        title="Equipe"
        description="Convide operadores ou outros proprietários para sua organização"
      />

      <section className="rounded-xl border border-border bg-surface/60 p-5">
        <Typography variant="subtitle" className="mb-4 flex items-center gap-2">
          <UserPlus className="h-4 w-4" aria-hidden />
          Novo convite
        </Typography>
        {inviteError && <ErrorState message={inviteError} className="mb-4" />}
        <form onSubmit={handleSubmit(onSubmit)} className="grid gap-4 sm:grid-cols-[1fr_auto_auto] sm:items-end">
          <div>
            <Label htmlFor="invite-email">E-mail</Label>
            <Input id="invite-email" type="email" className="mt-1.5" {...register("email")} />
            {errors.email && (
              <Typography variant="caption" className="mt-1 text-danger">
                {errors.email.message}
              </Typography>
            )}
          </div>
          <div>
            <Label htmlFor="invite-role">Papel</Label>
            <select
              id="invite-role"
              className="mt-1.5 h-10 w-full rounded-lg border border-border bg-surface px-3 text-body"
              {...register("tenantRole")}
            >
              <option value="operator">Operador</option>
              <option value="owner">Proprietário</option>
            </select>
          </div>
          <Button type="submit" loading={isSubmitting || createInvite.isPending}>
            Convidar
          </Button>
        </form>
        {lastInviteUrl && (
          <div className="mt-4 flex flex-col gap-2 rounded-lg border border-border bg-muted/30 p-3 sm:flex-row sm:items-center">
            <Typography variant="caption" className="min-w-0 flex-1 truncate">
              {lastInviteUrl}
            </Typography>
            <Button type="button" size="sm" variant="outline" icon={Copy} onClick={() => copyInvite(lastInviteUrl)}>
              Copiar link
            </Button>
          </div>
        )}
      </section>

      <section className="rounded-xl border border-border bg-surface/60 p-5">
        <Typography variant="subtitle" className="mb-4">
          Membros ({membersQuery.data?.total ?? members.length})
        </Typography>
        {membersQuery.isError ? (
          <ErrorState message="Não foi possível carregar a equipe." onRetry={() => membersQuery.refetch()} />
        ) : membersQuery.isLoading ? (
          <MemberListSkeleton />
        ) : members.length === 0 ? (
          <EmptyState
            title="Nenhum membro"
            description="Convide alguém para começar a montar sua equipe."
          />
        ) : (
          <ul className="space-y-2">
            {members.map((member) => {
              const isSelf = member._id === user?._id;
              return (
                <li
                  key={member._id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border px-3 py-2"
                >
                  <div>
                    <Typography variant="subtitle">
                      {member.name}
                      {isSelf && (
                        <Typography as="span" variant="caption" tone="muted" className="ml-2">
                          (você)
                        </Typography>
                      )}
                    </Typography>
                    <Typography variant="caption" tone="muted">
                      {member.email}
                    </Typography>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={member.tenantRole === "owner" ? "info" : "neutral"}>
                      {member.tenantRole === "owner" ? "Proprietário" : "Operador"}
                    </Badge>
                    <Badge variant={member.status === "approved" ? "success" : "warning"}>
                      {USER_STATUS_LABELS[member.status ?? ""] ?? member.status}
                    </Badge>
                    {!isSelf && (
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        icon={UserMinus}
                        onClick={() => handleRemoveMember(member._id, member.name)}
                        loading={removeMember.isPending}
                        aria-label={`Remover ${member.name}`}
                      >
                        Remover
                      </Button>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section className="rounded-xl border border-border bg-surface/60 p-5">
        <Typography variant="subtitle" className="mb-4">
          Convites pendentes
        </Typography>
        {invitesQuery.isError ? (
          <ErrorState message="Não foi possível carregar os convites." onRetry={() => invitesQuery.refetch()} />
        ) : invitesQuery.isLoading ? (
          <MemberListSkeleton />
        ) : invites.length === 0 ? (
          <Typography variant="body" tone="muted">
            Nenhum convite pendente.
          </Typography>
        ) : (
          <ul className="space-y-2">
            {invites.map((invite) => (
              <li
                key={invite._id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border px-3 py-2"
              >
                <div>
                  <Typography variant="subtitle">{invite.email}</Typography>
                  <Typography variant="caption" tone="muted">
                    Expira em {formatDateTime(invite.expiresAt)}
                  </Typography>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="neutral">{invite.tenantRole === "owner" ? "Proprietário" : "Operador"}</Badge>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    icon={Copy}
                    onClick={() => copyPendingInvite(invite._id)}
                    loading={copyingInviteId === invite._id}
                  >
                    Copiar link
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    icon={Trash2}
                    onClick={() => revokeInvite.mutate(invite._id)}
                    loading={revokeInvite.isPending}
                  >
                    Revogar
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </motion.div>
  );
}
