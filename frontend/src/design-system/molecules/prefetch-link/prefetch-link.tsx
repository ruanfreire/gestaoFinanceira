import { Link, type LinkProps } from "react-router-dom";
import { prefetchRoute } from "@/lib/route-prefetch";

export function PrefetchLink({ to, onMouseEnter, onFocus, ...props }: LinkProps) {
  const path = typeof to === "string" ? to : to.pathname ?? "";

  const prefetch = () => {
    if (path) prefetchRoute(path);
  };

  return (
    <Link
      {...props}
      to={to}
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
