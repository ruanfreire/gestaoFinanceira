const DEV_FALLBACK = 'http://localhost:5173';

function stripTrailingSlash(url: string): string {
  return url.replace(/\/$/, '');
}

function normalizeDomain(domain: string): string {
  return domain.replace(/^https?:\/\//, '').replace(/\/$/, '');
}

/** URL pública do frontend — convites, Stripe e notificações. */
export function resolveFrontendUrl(): string {
  const explicit = process.env.FRONTEND_URL?.trim();
  if (explicit) return stripTrailingSlash(explicit);

  const domain = process.env.APP_DOMAIN?.trim();
  if (domain) return `https://${normalizeDomain(domain)}`;

  return DEV_FALLBACK;
}
