import { ROUTES } from "@/lib/constants";
import { homePathForSlug, inferOrgSlugFromPath, stripOrgSlug, withOrgSlug } from "@/lib/org-path";
import type { AuthUser } from "./types";
import { isSuperadmin } from "./types";

export function resolveAuthHomePath(user: AuthUser | null, fallback?: string): string | null {
  if (!user) return null;
  if (isSuperadmin(user)) return ROUTES.superadmin;

  const slug = user.organization?.slug;
  if (!slug) return null;

  if (fallback && fallback !== ROUTES.home && fallback !== "/") {
    const fromSlug = inferOrgSlugFromPath(fallback);
    if (fromSlug === slug) return fallback;
    if (!fromSlug) return withOrgSlug(slug, stripOrgSlug(fallback, slug));
  }

  return homePathForSlug(slug);
}
