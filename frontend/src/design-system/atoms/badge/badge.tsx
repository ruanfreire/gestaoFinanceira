import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/design-system/lib/cn";

const badgeVariants = cva(
  "inline-flex items-center rounded-full px-2.5 py-0.5 text-caption font-medium transition-default",
  {
    variants: {
      variant: {
        default: "bg-primary-subtle text-primary",
        secondary: "bg-secondary text-secondary-foreground",
        success: "bg-success-subtle text-success",
        warning: "bg-warning-subtle text-warning",
        danger: "bg-danger-subtle text-danger",
        info: "bg-info-subtle text-info",
        outline: "border border-border text-foreground",
        neutral: "bg-muted text-muted-foreground",
      },
    },
    defaultVariants: { variant: "default" },
  },
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

export function Badge({ className, variant, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export const Tag = Badge;
export const Chip = Badge;
