import { createContext, useContext, useMemo } from "react";
import { useParams } from "react-router-dom";
import { withOrgSlug } from "@/lib/org-path";

type OrgSlugContextValue = {
  slug?: string;
  path: (route: string) => string;
};

const OrgSlugContext = createContext<OrgSlugContextValue>({
  path: (route) => route,
});

export function OrgSlugProvider({
  slug,
  children,
}: {
  slug?: string;
  children: React.ReactNode;
}) {
  const value = useMemo(
    () => ({
      slug,
      path: (route: string) => withOrgSlug(slug, route),
    }),
    [slug],
  );
  return <OrgSlugContext.Provider value={value}>{children}</OrgSlugContext.Provider>;
}

export function useOrgSlug() {
  return useContext(OrgSlugContext).slug;
}

export function useOrgPath() {
  return useContext(OrgSlugContext).path;
}

export function useOrgSlugFromParams() {
  const { orgSlug } = useParams();
  return orgSlug;
}
