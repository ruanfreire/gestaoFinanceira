import { Loader2 } from "lucide-react";
import { cn } from "@/design-system/lib/cn";

export function Spinner({ className, label = "Carregando" }: { className?: string; label?: string }) {
  return (
    <Loader2
      className={cn("h-5 w-5 animate-spin text-primary", className)}
      role="status"
      aria-label={label}
    />
  );
}
