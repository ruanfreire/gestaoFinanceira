import { Label, Typography } from "@/design-system/atoms";
import { cn } from "@/design-system/lib/cn";

export function FormGroup({
  label,
  htmlFor,
  description,
  error,
  success,
  required,
  children,
  className,
}: {
  label: string;
  htmlFor?: string;
  description?: string;
  error?: string;
  success?: string;
  required?: boolean;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("stack-gap gap-2", className)}>
      <Label htmlFor={htmlFor} required={required}>
        {label}
      </Label>
      {description && (
        <Typography variant="caption" tone="muted">
          {description}
        </Typography>
      )}
      {children}
      {error && (
        <Typography variant="caption" tone="danger" role="alert">
          {error}
        </Typography>
      )}
      {success && !error && (
        <Typography variant="caption" tone="success" role="status">
          {success}
        </Typography>
      )}
    </div>
  );
}
