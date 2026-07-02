import { Typography } from "@/design-system/atoms";
import { cn } from "@/design-system/lib/cn";
import { APP_NAME, LOGO_ICON_SRC } from "@/lib/brand";

const iconSizes = {
  sm: "h-7 w-7",
  md: "h-8 w-8",
  lg: "h-10 w-10",
} as const;

const nameVariants = {
  sm: "subtitle" as const,
  md: "subtitle" as const,
  lg: "h2" as const,
};

export function BrandLogo({
  size = "md",
  showName = true,
  className,
}: {
  size?: keyof typeof iconSizes;
  showName?: boolean;
  className?: string;
}) {
  return (
    <div className={cn("flex items-center gap-3", className)}>
      <img src={LOGO_ICON_SRC} alt="" className={iconSizes[size]} aria-hidden />
      {showName && (
        <Typography variant={nameVariants[size]} as={size === "lg" ? "h2" : "p"}>
          {APP_NAME}
        </Typography>
      )}
    </div>
  );
}
