import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/design-system/lib/cn";

const inputVariants = cva(
  "flex w-full rounded-lg border bg-surface px-3 text-body transition-default placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:bg-disabled-bg disabled:text-disabled",
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

export interface InputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "size">,
    VariantProps<typeof inputVariants> {}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, size, state, type = "text", ...props }, ref) => (
    <input type={type} className={cn(inputVariants({ size, state }), className)} ref={ref} {...props} />
  ),
);
Input.displayName = "Input";
