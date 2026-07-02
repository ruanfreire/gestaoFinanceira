import { ReactNode, useId } from "react";
import Label from "./Label";

type FormFieldProps = {
  label?: ReactNode;
  htmlFor?: string;
  hint?: ReactNode;
  error?: ReactNode;
  required?: boolean;
  children: ReactNode;
  className?: string;
};

export default function FormField({
  label,
  htmlFor,
  hint,
  error,
  required = false,
  children,
  className = "",
}: FormFieldProps) {
  const autoId = useId().replace(/:/g, "");
  const fieldId = htmlFor ?? `field-${autoId}`;
  const hintId = hint ? `${fieldId}-hint` : undefined;
  const errorId = error ? `${fieldId}-error` : undefined;

  return (
    <div className={className}>
      {label && (
        <Label htmlFor={fieldId}>
          {label}
          {required && (
            <span className="ml-0.5 text-error-500" aria-hidden="true">
              *
            </span>
          )}
        </Label>
      )}
      <div
        aria-describedby={[hintId, errorId].filter(Boolean).join(" ") || undefined}
        aria-invalid={error ? true : undefined}
      >
        {children}
      </div>
      {hint && !error && (
        <p id={hintId} className="mt-1.5 text-xs text-gray-500 dark:text-gray-400">
          {hint}
        </p>
      )}
      {error && (
        <p id={errorId} className="mt-1.5 text-xs text-error-600 dark:text-error-400" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
