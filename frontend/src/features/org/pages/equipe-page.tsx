import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { motion } from "framer-motion";
import { Copy, Trash2, UserPlus } from "lucide-react";
import { Navigate } from "react-router-dom";
import { PageHeader, ErrorState } from "@/design-system/molecules";
import { Badge, Button, Input, Label, Typography } from "@/design-system/atoms";
import { useToast } from "@/app/toast-provider";
import { useAuth } from "@/features/auth/context";
import { isTenantOwner } from "@/features/auth/types";
import { ROUTES } from "@/lib/constants";
import { formatDateTime } from "@/lib/format";
import { useCreateInvite, useOrgInvites, useOrgMembers, useRevokeInvite } from "../hooks";

const inviteSchema = z.object({
  email: z.string().email("E-mail inválido"),
  tenantRole: z.enum(["owner", "operator"]),
});

type InviteForm = z.infer<typeof inviteSchema>;

export default function EquipePage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const membersQuery = useOrgMembers();
  const invitesQuery = useOrgInvites();
  const createInvite = useCreateInvite();
  const revokeInvite = useRevokeInvite();
  const [lastInviteUrl, setLastInviteUrl] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<InviteForm>({
    resolver: zodResolver(inviteSchema),
    defaultValues: { tenantRole: "operator" },
  });

  if (!isTenantOwner(user)) {
    return <Navigate to={ROUTES.home} replace />;
  }

  const onSubmit = async (data: InviteForm) => {
    const result = await createInvite.mutateAsync(data);
    setLastInviteUrl(result.inviteUrl);
    reset({ email: "", tenantRole: data.tenantRole });
    toast("Convite criado", "success");
  };

  const copyInvite = async (url: string) => {
    await navigator.clipboard.writeText(url);
    toast("Link copiado", "success");
  };

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
          Membros
        </Typography>
        {membersQuery.isError ? (
          <ErrorState message="Não foi possível carregar a equipe." onRetry={() => membersQuery.refetch()} />
        ) : (
          <ul className="space-y-2">
            {(membersQuery.data?.items ?? []).map((member) => (
              <li
                key={member._id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border px-3 py-2"
              >
                <div>
                  <Typography variant="subtitle">{member.name}</Typography>
                  <Typography variant="caption" tone="muted">
                    {member.email}
                  </Typography>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={member.tenantRole === "owner" ? "info" : "neutral"}>
                    {member.tenantRole === "owner" ? "Proprietário" : "Operador"}
                  </Badge>
                  <Badge variant={member.status === "approved" ? "success" : "warning"}>{member.status}</Badge>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="rounded-xl border border-border bg-surface/60 p-5">
        <Typography variant="subtitle" className="mb-4">
          Convites pendentes
        </Typography>
        {(invitesQuery.data?.items ?? []).length === 0 ? (
          <Typography variant="body" tone="muted">
            Nenhum convite pendente.
          </Typography>
        ) : (
          <ul className="space-y-2">
            {invitesQuery.data?.items.map((invite) => (
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
