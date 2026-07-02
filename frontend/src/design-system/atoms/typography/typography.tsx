import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/design-system/lib/cn";

const typographyVariants = cva("", {
  variants: {
    variant: {
      display: "text-[length:var(--text-display)] leading-[var(--text-display--line-height)] font-bold tracking-tight",
      h1: "text-[length:var(--text-h1)] leading-[var(--text-h1--line-height)] font-semibold tracking-tight",
      h2: "text-[length:var(--text-h2)] leading-[var(--text-h2--line-height)] font-semibold",
      h3: "text-[length:var(--text-h3)] leading-[var(--text-h3--line-height)] font-semibold",
      title: "text-[length:var(--text-title)] leading-[var(--text-title--line-height)] font-semibold",
      subtitle: "text-[length:var(--text-subtitle)] leading-[var(--text-subtitle--line-height)] font-medium",
      body: "text-[length:var(--text-body)] leading-[var(--text-body--line-height)]",
      small: "text-[length:var(--text-small)] leading-[var(--text-small--line-height)]",
      caption: "text-[length:var(--text-caption)] leading-[var(--text-caption--line-height)]",
      overline:
        "text-[length:var(--text-overline)] leading-[var(--text-overline--line-height)] font-semibold uppercase tracking-widest",
    },
    tone: {
      default: "text-foreground",
      muted: "text-muted-foreground",
      primary: "text-primary",
      danger: "text-danger",
      success: "text-success",
    },
  },
  defaultVariants: { variant: "body", tone: "default" },
});

type Variant = NonNullable<VariantProps<typeof typographyVariants>["variant"]>;

const defaultElement: Record<Variant, keyof JSX.IntrinsicElements> = {
  display: "h1",
  h1: "h1",
  h2: "h2",
  h3: "h3",
  title: "p",
  subtitle: "p",
  body: "p",
  small: "p",
  caption: "p",
  overline: "span",
};

export interface TypographyProps
  extends React.HTMLAttributes<HTMLElement>,
    VariantProps<typeof typographyVariants> {
  as?: keyof JSX.IntrinsicElements;
}

export function Typography({
  variant = "body",
  tone,
  as,
  className,
  children,
  ...props
}: TypographyProps) {
  const Component = (as ?? defaultElement[variant!]) as React.ElementType;
  const resolvedTone =
    tone ?? (variant === "caption" || variant === "overline" ? "muted" : "default");
  return (
    <Component className={cn(typographyVariants({ variant, tone: resolvedTone }), className)} {...props}>
      {children}
    </Component>
  );
}
