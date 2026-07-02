const PUBLIC_PREFIXES = ["/auth", "/superadmin", "/convite"];

/** Primeiro segmento de rotas da app (sem slug de org). */
const APP_ROUTE_ROOTS = new Set([
  "notas",
  "recebimentos",
  "arquivos",
  "analises",
  "configuracoes",
]);

export function isPublicAppPath(path: string): boolean {
  return PUBLIC_PREFIXES.some((prefix) => path === prefix || path.startsWith(`${prefix}/`));
}

export function stripOrgSlug(pathname: string, orgSlug?: string): string {
  if (pathname === "/" || isPublicAppPath(pathname)) return pathname;

  if (orgSlug) {
    const prefix = `/${orgSlug}`;
    if (pathname === prefix) return "/";
    if (pathname.startsWith(`${prefix}/`)) {
      const rest = pathname.slice(prefix.length);
      return rest || "/";
    }
  }

  const parts = pathname.split("/").filter(Boolean);
  if (parts.length === 0) return "/";

  if (APP_ROUTE_ROOTS.has(parts[0]!)) return pathname;

  if (parts.length >= 2) {
    const rest = parts.slice(1).join("/");
    return rest ? `/${rest}` : "/";
  }

  return pathname;
}

export function withOrgSlug(slug: string | undefined, path: string): string {
  if (!slug || isPublicAppPath(path)) return path;
  const normalized = path.startsWith("/") ? path : `/${path}`;
  if (normalized === "/") return `/${slug}`;
  if (normalized.startsWith(`/${slug}/`) || normalized === `/${slug}`) return normalized;
  return `/${slug}${normalized}`;
}

export function homePathForSlug(slug?: string): string {
  return slug ? `/${slug}` : "/";
}

export function loginPathForSlug(slug?: string): string {
  if (!slug) return "/auth/entrar";
  return `/auth/entrar?org=${encodeURIComponent(slug)}`;
}
