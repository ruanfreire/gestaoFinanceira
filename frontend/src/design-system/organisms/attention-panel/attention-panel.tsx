import { Link } from "react-router-dom";
import { ArrowRight, AlertTriangle, Info, CircleAlert } from "lucide-react";
import { Button, Typography } from "@/design-system/atoms";
import { cn } from "@/design-system/lib/cn";

export type AttentionItem = {
  id: string;
  title: string;
  message: string;
  link: string;
  linkLabel: string;
  type?: "warning" | "info" | "error";
};

const styles = {
  warning: {
    icon: AlertTriangle,
    chip: "bg-warning-subtle text-warning",
    border: "border-warning/25",
  },
  info: {
    icon: Info,
    chip: "bg-info-subtle text-info",
    border: "border-info/25",
  },
  error: {
    icon: CircleAlert,
    chip: "bg-danger-subtle text-danger",
    border: "border-danger/25",
  },
} as const;

export function AttentionPanel({ items }: { items: AttentionItem[] }) {
  if (items.length === 0) return null;

  return (
    <section aria-label="Precisa da sua atenção" className="space-y-2">
      <Typography variant="caption" tone="muted" className="font-medium uppercase tracking-wide">
        Precisa da sua atenção
      </Typography>
      <div className="space-y-2">
        {items.map((item) => {
          const type = item.type ?? "warning";
          const style = styles[type];
          const Icon = style.icon;
          return (
            <div
              key={item.id}
              className={cn(
                "flex flex-col gap-3 rounded-xl border bg-surface/60 px-4 py-3 sm:flex-row sm:items-center sm:justify-between",
                style.border,
              )}
            >
              <div className="flex min-w-0 items-start gap-3">
                <span
                  className={cn(
                    "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg",
                    style.chip,
                  )}
                  aria-hidden
                >
                  <Icon className="h-3.5 w-3.5" />
                </span>
                <div className="min-w-0">
                  <Typography variant="subtitle" className="text-body">
                    {item.title}
                  </Typography>
                  <Typography variant="caption" tone="muted" className="mt-0.5 line-clamp-2">
                    {item.message}
                  </Typography>
                </div>
              </div>
              <Button size="sm" variant="outline" className="w-full shrink-0 sm:w-auto" asChild>
                <Link to={item.link}>
                  {item.linkLabel}
                  <ArrowRight className="h-3.5 w-3.5 shrink-0" aria-hidden />
                </Link>
              </Button>
            </div>
          );
        })}
      </div>
    </section>
  );
}
