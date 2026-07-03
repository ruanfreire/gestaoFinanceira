import { platformApi } from "@/features/platform/api";

const PUSH_SW_URL = "/push-sw.js";

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = window.atob(base64);
  return Uint8Array.from([...raw].map((char) => char.charCodeAt(0)));
}

export function isPushSupported(): boolean {
  return typeof window !== "undefined" && "serviceWorker" in navigator && "PushManager" in window;
}

/** Garante service worker para push (em dev o PWA não registra automaticamente). */
export async function ensurePushServiceWorker(): Promise<boolean> {
  if (!isPushSupported()) return false;

  const existing = await navigator.serviceWorker.getRegistration("/");
  if (existing?.active) return true;

  try {
    await navigator.serviceWorker.register(PUSH_SW_URL, { scope: "/" });
    await navigator.serviceWorker.ready;
    return true;
  } catch {
    return false;
  }
}

export type EnablePushResult =
  | { ok: true }
  | { ok: false; reason: "unsupported" | "no_vapid" | "denied" | "no_sw" | "subscribe_failed" };

export async function registerPushNotifications(): Promise<boolean> {
  const result = await enablePushNotifications();
  return result.ok;
}

export async function enablePushNotifications(): Promise<EnablePushResult> {
  if (!isPushSupported()) return { ok: false, reason: "unsupported" };

  const swReady = await ensurePushServiceWorker();
  if (!swReady) return { ok: false, reason: "no_sw" };

  if (Notification.permission === "denied") return { ok: false, reason: "denied" };

  const publicKey = await platformApi.getVapidPublicKey();
  if (!publicKey) return { ok: false, reason: "no_vapid" };

  if (Notification.permission === "default") {
    const permission = await Notification.requestPermission();
    if (permission !== "granted") return { ok: false, reason: "denied" };
  }

  const registration = await navigator.serviceWorker.ready;
  const existing = await registration.pushManager.getSubscription();
  const subscription =
    existing ||
    (await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(publicKey),
    }));

  const json = subscription.toJSON();
  if (!json.endpoint || !json.keys?.p256dh || !json.keys?.auth) {
    return { ok: false, reason: "subscribe_failed" };
  }

  await platformApi.subscribePush({
    endpoint: json.endpoint,
    keys: { p256dh: json.keys.p256dh, auth: json.keys.auth },
  });
  return { ok: true };
}

export function pushEnableErrorMessage(
  reason: "unsupported" | "no_vapid" | "denied" | "no_sw" | "subscribe_failed",
): string {
  switch (reason) {
    case "unsupported":
      return "Este navegador não suporta notificações push.";
    case "no_sw":
      return "Não foi possível registrar o service worker. Tente recarregar a página.";
    case "no_vapid":
      return "Push não está configurado no servidor (chaves VAPID).";
    case "denied":
      return "Permissão bloqueada. Nas configurações do site/navegador, permita notificações para este endereço.";
    case "subscribe_failed":
      return "Não foi possível inscrever este dispositivo.";
    default:
      return "Não foi possível ativar notificações.";
  }
}
