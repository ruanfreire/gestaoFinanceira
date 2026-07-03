import { useEffect, useMemo, useState } from "react";
import { Checkbox } from "@/design-system/atoms";
import { Button, Typography } from "@/design-system/atoms";
import { Modal } from "@/design-system/organisms";
import { useAuth } from "@/features/auth/context";
import { platformApi } from "@/features/platform/api";
import {
  enablePushNotifications,
  isPushSupported,
  pushEnableErrorMessage,
} from "@/lib/push-notifications";
import { OPEN_PUSH_PROMPT_EVENT } from "@/lib/push-prompt-events";
import { useToast } from "@/app/toast-provider";

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

const ASKED_KEY = "pushPermissionAsked";

function shouldAutoPrompt() {
  if (typeof window === "undefined") return false;
  if (!isPushSupported()) return false;
  if (!("localStorage" in window)) return false;
  if (localStorage.getItem(ASKED_KEY) === "true") return false;
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
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [forced, setForced] = useState(false);
  const [loading, setLoading] = useState(false);
  const [prefs, setPrefs] = useState<PushCategories>(DEFAULT_PREFS);

  const permission = typeof Notification !== "undefined" ? Notification.permission : "denied";
  const canAutoPrompt = useMemo(() => shouldAutoPrompt(), []);

  useEffect(() => {
    const onOpen = () => {
      setForced(true);
      setOpen(true);
    };
    window.addEventListener(OPEN_PUSH_PROMPT_EVENT, onOpen);
    return () => window.removeEventListener(OPEN_PUSH_PROMPT_EVENT, onOpen);
  }, []);

  useEffect(() => {
    if (!canAutoPrompt || !user) return;
    setOpen(true);
    platformApi
      .getPushPreferences()
      .then((p) => setPrefs({ ...DEFAULT_PREFS, ...p } as PushCategories))
      .catch(() => undefined);
  }, [canAutoPrompt, user]);

  useEffect(() => {
    if (!open || !forced || !user) return;
    platformApi
      .getPushPreferences()
      .then((p) => setPrefs({ ...DEFAULT_PREFS, ...p } as PushCategories))
      .catch(() => undefined);
  }, [forced, open, user]);

  const close = (markAsked: boolean) => {
    if (markAsked) localStorage.setItem(ASKED_KEY, "true");
    setForced(false);
    setOpen(false);
  };

  const activate = async () => {
    setLoading(true);
    try {
      await platformApi.updatePushPreferences(prefs);
      const result = await enablePushNotifications();
      if (result.ok) {
        toast("Notificações push ativadas neste dispositivo", "success");
        close(true);
        return;
      }
      toast(pushEnableErrorMessage(result.reason), "error");
    } finally {
      setLoading(false);
    }
  };

  if (!isPushSupported()) return null;

  return (
    <Modal
      open={open}
      onOpenChange={(next) => {
        if (!next) close(true);
        else setOpen(true);
      }}
      title="Ativar notificações por push?"
      description={
        permission === "denied"
          ? "O navegador está bloqueando notificações para este site."
          : "Você escolhe quais tipos de mensagens quer receber. Depois disso, o navegador vai pedir permissão."
      }
      footer={
        permission === "denied" ? (
          <Button type="button" onClick={() => close(true)}>
            Entendi
          </Button>
        ) : (
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
                  close(true);
                  setLoading(false);
                }
              }}
            >
              Agora não
            </Button>
            <Button type="button" disabled={loading} onClick={() => void activate()}>
              Ativar notificações
            </Button>
          </>
        )
      }
    >
      {permission === "denied" ? (
        <Typography variant="body">
          Abra as configurações do site no navegador (ícone de cadeado na barra de endereço) e permita
          notificações. Depois use <strong>Ctrl+K</strong> e busque &quot;Ativar notificações push&quot;.
        </Typography>
      ) : (
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
      )}
    </Modal>
  );
}
