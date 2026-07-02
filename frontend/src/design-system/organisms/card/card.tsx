import { Typography, Skeleton, Spinner } from "@/design-system/atoms";
import { cn } from "@/design-system/lib/cn";

export function Card({
  children,
  className,
  hover,
  onClick,
  role,
  tabIndex,
}: {
  children: React.ReactNode;
  className?: string;
  hover?: boolean;
  onClick?: () => void;
  role?: React.AriaRole;
  tabIndex?: number;
}) {
  return (
    <div
      className={cn(
        "rounded-xl border border-border bg-surface shadow-xs transition-default",
        hover && "hover:shadow-sm",
        onClick && "cursor-pointer",
        className,
      )}
      onClick={onClick}
      role={role ?? (onClick ? "button" : undefined)}
      tabIndex={tabIndex ?? (onClick ? 0 : undefined)}
      onKeyDown={
        onClick
          ? (e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onClick();
              }
            }
          : undefined
      }
    >
      {children}
    </div>
  );
}

export function CardHeader({
  title,
  description,
  actions,
  className,
}: {
  title?: string;
  description?: string;
  actions?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex items-start justify-between gap-3 border-b border-border-subtle px-4 py-4 sm:px-6", className)}>
      <div>
        {title && <Typography variant="title">{title}</Typography>}
        {description && (
          <Typography variant="caption" tone="muted" className="mt-1">
            {description}
          </Typography>
        )}
      </div>
      {actions}
    </div>
  );
}

export function CardBody({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn("px-4 py-4 sm:px-6 sm:py-5", className)}>{children}</div>;
}

export function CardFooter({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("flex items-center gap-2 border-t border-border-subtle px-4 py-4 sm:px-6", className)}>
      {children}
    </div>
  );
}

export function CardLoading() {
  return (
    <Card>
      <CardBody className="flex items-center justify-center py-12">
        <Spinner />
      </CardBody>
    </Card>
  );
}

export function CardEmpty({ title, description }: { title: string; description: string }) {
  return (
    <Card>
      <CardBody className="py-12 text-center">
        <Typography variant="title">{title}</Typography>
        <Typography variant="body" tone="muted" className="mt-2">
          {description}
        </Typography>
      </CardBody>
    </Card>
  );
}

export function CardSkeleton() {
  return (
    <Card>
      <CardBody className="space-y-3">
        <Skeleton className="h-4 w-1/3" />
        <Skeleton className="h-8 w-full" />
      </CardBody>
    </Card>
  );
}
