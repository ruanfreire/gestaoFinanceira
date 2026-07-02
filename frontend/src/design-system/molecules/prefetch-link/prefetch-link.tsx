import { Link, type LinkProps } from "react-router-dom";
import { prefetchRoute } from "@/lib/route-prefetch";
import { useOrgPath } from "@/features/org/org-slug-context";
import { isPublicAppPath, withOrgSlug } from "@/lib/org-path";
import { useOrgSlug } from "@/features/org/org-slug-context";

export function PrefetchLink({ to, onMouseEnter, onFocus, ...props }: LinkProps) {
  const orgPath = useOrgPath();
  const slug = useOrgSlug();

  const resolvedTo =
    typeof to === "string"
      ? isPublicAppPath(to)
        ? to
        : orgPath(to)
      : to.pathname
        ? { ...to, pathname: isPublicAppPath(to.pathname) ? to.pathname : withOrgSlug(slug, to.pathname) }
        : to;

  const path = typeof resolvedTo === "string" ? resolvedTo : resolvedTo.pathname ?? "";

  const prefetch = () => {
    if (path) prefetchRoute(path);
  };

  return (
    <Link
      {...props}
      to={resolvedTo}
      onMouseEnter={(e) => {
        prefetch();
        onMouseEnter?.(e);
      }}
      onFocus={(e) => {
        prefetch();
        onFocus?.(e);
      }}
    />
  );
}
