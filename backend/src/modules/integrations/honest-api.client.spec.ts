import { describe, expect, it } from 'vitest';
import { keycloakPasswordLogin } from './honest-api.client';

describe('honest-api.client', () => {
  it('monta requisição Keycloak no endpoint oficial da Honest', async () => {
    const originalFetch = global.fetch;
    let capturedUrl = '';
    let capturedBody = '';

    global.fetch = (async (url: string | URL | Request, init?: RequestInit) => {
      capturedUrl = String(url);
      capturedBody = String(init?.body ?? '');
      return new Response(JSON.stringify({ access_token: 'token-abc', refresh_token: 'refresh-xyz', expires_in: 300 }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }) as typeof fetch;

    try {
      const result = await keycloakPasswordLogin(
        {
          authBaseUrl: 'https://auth.honest.com.br',
          realm: 'cliente',
          clientId: 'back-front',
        },
        'user@honest.com',
        'secret',
        5_000,
        'https://honest.com.br',
      );

      expect(result.ok).toBe(true);
      expect(capturedUrl).toBe(
        'https://auth.honest.com.br/realms/cliente/protocol/openid-connect/token',
      );
      expect(capturedBody).toContain('grant_type=password');
      expect(capturedBody).toContain('client_id=back-front');
      expect(capturedBody).toContain('username=user%40honest.com');
      expect(result.session?.baseUrl).toBe('https://honest.com.br');
      expect(result.session?.token).toBe('token-abc');
    } finally {
      global.fetch = originalFetch;
    }
  });
});
