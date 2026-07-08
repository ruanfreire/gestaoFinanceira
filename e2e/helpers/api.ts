import { expect, type APIRequestContext } from "@playwright/test";

const API_BASE = process.env.E2E_API_URL ?? "http://127.0.0.1:4001/api";

export const E2E_TENANT_USERS = {
  demo: {
    email: "admin@finance.local",
    password: "e2e-test-pass",
    slug: "empresa-demo",
    empresa: "Empresa Demo",
  },
  acme: {
    email: "admin@acme.local",
    password: "e2e-test-pass",
    slug: "acme-consultoria",
    empresa: "Acme Consultoria",
  },
} as const;

export async function apiLogin(
  request: APIRequestContext,
  email: string,
  password: string,
): Promise<string> {
  const response = await request.post(`${API_BASE}/auth/login`, {
    data: { email, password },
  });
  expect(response.ok(), `login falhou para ${email}`).toBeTruthy();
  const body = (await response.json()) as { accessToken?: string };
  expect(body.accessToken).toBeTruthy();
  return body.accessToken!;
}
