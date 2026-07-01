import { ReactNode } from "react";
import Button from "../button/Button";

type EmptyStateProps = {
  title: string;
  description?: string;
  icon?: ReactNode;
  actionLabel?: string;
  onAction?: () => void;
  children?: ReactNode;
  className?: string;
  /** Menos padding e sem borda tracejada — para uso dentro de cards. */
  embedded?: boolean;
};

export default function EmptyState({
  title,
  description,
  icon,
  actionLabel,
  onAction,
  children,
  className = "",
  embedded = false,
}: EmptyStateProps) {
  return (
    <div
      className={`flex flex-col items-center justify-center text-center ${
        embedded
          ? "px-2 py-8"
          : "rounded-2xl border border-dashed border-gray-200 bg-gray-50/50 px-6 py-12 dark:border-gray-800 dark:bg-gray-900/40"
      } ${className}`}
      role="status"
    >
      {icon && (
        <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400">
          {icon}
        </div>
      )}
      <h3 className="text-base font-semibold text-gray-800 dark:text-white/90">{title}</h3>
      {description && (
        <p className="mt-2 max-w-md text-sm text-gray-500 dark:text-gray-400">{description}</p>
      )}
      {children}
      {actionLabel && onAction && (
        <div className="mt-5">
          <Button onClick={onAction}>{actionLabel}</Button>
        </div>
      )}
    </div>
  );
}
