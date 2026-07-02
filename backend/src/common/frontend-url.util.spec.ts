import { afterEach, describe, expect, it } from 'vitest';
import { resolveFrontendUrl } from './frontend-url.util';

describe('resolveFrontendUrl', () => {
  const env = process.env;

  afterEach(() => {
    process.env = { ...env };
  });

  it('usa FRONTEND_URL quando definida', () => {
    process.env.FRONTEND_URL = 'https://app.exemplo.com/';
    delete process.env.APP_DOMAIN;
    expect(resolveFrontendUrl()).toBe('https://app.exemplo.com');
  });

  it('deriva de APP_DOMAIN em produção', () => {
    delete process.env.FRONTEND_URL;
    process.env.APP_DOMAIN = 'financeiro.exemplo.com.br';
    expect(resolveFrontendUrl()).toBe('https://financeiro.exemplo.com.br');
  });

  it('fallback local em dev', () => {
    delete process.env.FRONTEND_URL;
    delete process.env.APP_DOMAIN;
    expect(resolveFrontendUrl()).toBe('http://localhost:5173');
  });
});
