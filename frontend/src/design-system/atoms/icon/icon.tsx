import { type LucideIcon } from "lucide-react";
import { cn } from "@/design-system/lib/cn";

const sizes = { sm: "h-4 w-4", md: "h-5 w-5", lg: "h-6 w-6", xl: "h-8 w-8" } as const;

export function Icon({
  icon: IconComponent,
  size = "md",
  className,
  label,
}: {
  icon: LucideIcon;
  size?: keyof typeof sizes;
  className?: string;
  label?: string;
}) {
  return (
    <IconComponent
      className={cn("shrink-0", sizes[size], className)}
      aria-hidden={!label}
      aria-label={label}
    />
  );
}
