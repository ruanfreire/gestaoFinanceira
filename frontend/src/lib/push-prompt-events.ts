export const OPEN_PUSH_PROMPT_EVENT = "gestao:open-push-prompt";

export function openPushPermissionPrompt() {
  window.dispatchEvent(new CustomEvent(OPEN_PUSH_PROMPT_EVENT));
}
