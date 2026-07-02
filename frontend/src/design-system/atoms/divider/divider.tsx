import * as SeparatorPrimitive from "@radix-ui/react-separator";
import { cn } from "@/design-system/lib/cn";

export function Divider({
  className,
  orientation = "horizontal",
}: {
  className?: string;
  orientation?: "horizontal" | "vertical";
}) {
  return (
    <SeparatorPrimitive.Root
      decorative
      orientation={orientation}
      className={cn(
        "shrink-0 bg-border",
        orientation === "horizontal" ? "h-px w-full" : "h-full w-px",
        className,
      )}
    />
  );
}
