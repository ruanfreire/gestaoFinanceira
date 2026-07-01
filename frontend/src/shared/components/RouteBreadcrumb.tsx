import { Link, useLocation } from "react-router-dom";
import { resolveBreadcrumb } from "@/layouts/navigation";

export function RouteBreadcrumb() {
  const { pathname } = useLocation();
  const resolved = resolveBreadcrumb(pathname);

  if (!resolved) return null;

  return (
    <nav aria-label="Breadcrumb" className="mb-5">
      <ol className="flex flex-wrap items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400">
        <li>
          <Link to="/" className="hover:text-brand-600 dark:hover:text-brand-400">
            Início
          </Link>
        </li>
        {resolved.segments.map((segment, index) => (
          <li key={`${segment.label}-${index}`} className="flex items-center gap-1.5">
            <span aria-hidden>/</span>
            {segment.path ? (
              <Link to={segment.path} className="hover:text-brand-600 dark:hover:text-brand-400">
                {segment.label}
              </Link>
            ) : (
              <span className="text-gray-800 dark:text-white/90">{segment.label}</span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}
