import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/design-system/lib/cn";

const selectVariants = cva(
  "flex w-full rounded-lg border bg-surface px-3 text-body transition-default focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:bg-disabled-bg disabled:text-disabled",
  {
    variants: {
      size: {
        sm: "h-9 text-small",
        md: "h-11",
        lg: "h-12 text-subtitle",
      },
      state: {
        default: "border-input",
        error: "border-danger focus-visible:ring-danger",
        success: "border-success focus-visible:ring-success",
      },
    },
    defaultVariants: { size: "md", state: "default" },
  },
);

export interface SelectProps
  extends Omit<React.SelectHTMLAttributes<HTMLSelectElement>, "size">,
    VariantProps<typeof selectVariants> {}

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, size, state, children, ...props }, ref) => (
    <select className={cn(selectVariants({ size, state }), className)} ref={ref} {...props}>
      {children}
    </select>
  ),
);
Select.displayName = "Select";
