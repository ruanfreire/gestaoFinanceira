import { useLayoutEffect } from "react";
import { useLocation, useParams } from "react-router-dom";
import { formatDocumentTitle, resolvePageTitle } from "@/lib/page-titles";

export function usePageTitle() {
  const { pathname } = useLocation();
  const { orgSlug } = useParams();

  useLayoutEffect(() => {
    const title = resolvePageTitle(pathname, orgSlug);
    document.title = formatDocumentTitle(title);
  }, [pathname, orgSlug]);
}

export function PageTitleSync() {
  usePageTitle();
  return null;
}
