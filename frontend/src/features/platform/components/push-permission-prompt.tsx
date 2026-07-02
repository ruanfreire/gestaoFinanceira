import { useEffect, useMemo, useState } from "react";
import { Checkbox } from "@/design-system/atoms";
import { Button, Typography } from "@/design-system/atoms";
import { Modal } from "@/design-system/organisms";
import { useAuth } from "@/features/auth/context";
import { platformApi } from "@/features/platform/api";
import { registerPushNotifications } from "@/lib/push-notifications";

type PushCategories = {
  platform: boolean;
  imports: boolean;
  conciliation: boolean;
  billing: boolean;
  team: boolean;
};

const DEFAULT_PREFS: PushCategories = {
  platform: true,
  imports: true,
  conciliation: true,
  billing: true,
  team: true,
};

const ALL_OFF: PushCategories = {
  platform: false,
  imports: false,
  conciliation: false,
  billing: false,
  team: false,
};

function shouldAskPermission() {
  if (!import.meta.env.PROD) return false;
  if (typeof window === "undefined") return false;
  if (!("Notification" in window)) return false;
  if (!("localStorage" in window)) return false;

  if (localStorage.getItem("pushPermissionAsked") === "true") return false;
  return Notification.permission === "default";
}

function labelForCategory(key: keyof PushCategories) {
  switch (key) {
    case "platform":
      return "Status de cadastro (aprovação, reprovação, suspensão)";
    case "imports":
      return "Importações (JSON / CSV)";
    case "conciliation":
      return "Conciliação (pendências e sem correspondência)";
    case "billing":
      return "Plano e assinatura";
    case "team":
      return "Convites e equipe";
  }
}

export function PushPermissionPrompt() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [prefs, setPrefs] = useState<PushCategories>(DEFAULT_PREFS);

  const canAsk = useMemo(() => shouldAskPermission(), []);

  useEffect(() => {
    if (!canAsk) return;
    if (!user) return;

    setOpen(true);
    platformApi
      .getPushPreferences()
      .then((p) => setPrefs({ ...DEFAULT_PREFS, ...p } as PushCategories))
      .catch(() => undefined);
  }, [canAsk, user]);

  return (
    <Modal
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) localStorage.setItem("pushPermissionAsked", "true");
      }}
      title="Ativar notificações por push?"
      description="Você escolhe quais tipos de mensagens quer receber. Depois disso, o navegador vai pedir permissão."
      footer={
        <>
          <Button
            type="button"
            variant="outline"
            disabled={loading}
            onClick={async () => {
              setLoading(true);
              try {
                await platformApi.updatePushPreferences(ALL_OFF);
              } finally {
                localStorage.setItem("pushPermissionAsked", "true");
                setOpen(false);
                setLoading(false);
              }
            }}
          >
            Agora não
          </Button>
          <Button
            type="button"
            disabled={loading}
            onClick={async () => {
              setLoading(true);
              try {
                await platformApi.updatePushPreferences(prefs);
                await registerPushNotifications();
              } finally {
                localStorage.setItem("pushPermissionAsked", "true");
                setOpen(false);
                setLoading(false);
              }
            }}
          >
            Ativar notificações
          </Button>
        </>
      }
    >
      <div className="space-y-3">
        <Typography variant="caption" tone="muted">
          Se você habilitar um tipo, você pode receber várias mensagens desse tipo.
        </Typography>

        <div className="space-y-2">
          {(Object.keys(DEFAULT_PREFS) as Array<keyof PushCategories>).map((key) => (
            <label key={key} className="flex cursor-pointer items-start gap-3">
              <Checkbox
                checked={prefs[key]}
                onCheckedChange={(checked) => {
                  const value = checked === true;
                  setPrefs((p) => ({ ...p, [key]: value }));
                }}
              />
              <span className="text-small">{labelForCategory(key)}</span>
            </label>
          ))}
        </div>
      </div>
    </Modal>
  );
}

