import { useLayoutEffect } from "react";
import { useLocation } from "react-router-dom";
import { formatDocumentTitle, resolvePageTitle } from "@/lib/page-titles";

export function usePageTitle() {
  const { pathname } = useLocation();

  useLayoutEffect(() => {
    const title = resolvePageTitle(pathname);
    document.title = formatDocumentTitle(title);
  }, [pathname]);
}

export function PageTitleSync() {
  usePageTitle();
  return null;
}
