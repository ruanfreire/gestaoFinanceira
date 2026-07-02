import { ReactNode } from "react";

interface ButtonProps {
  children?: ReactNode;
  size?: "sm" | "md" | "icon";
  variant?: "primary" | "outline" | "ghost" | "danger" | "link";
  startIcon?: ReactNode;
  endIcon?: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  loading?: boolean;
  className?: string;
  type?: "button" | "submit" | "reset";
  /** Rótulo acessível quando size="icon" */
  ariaLabel?: string;
}

const Button: React.FC<ButtonProps> = ({
  children,
  size = "md",
  variant = "primary",
  startIcon,
  endIcon,
  onClick,
  className = "",
  disabled = false,
  loading = false,
  type = "button",
  ariaLabel,
}) => {
  const isDisabled = disabled || loading;

  const sizeClasses = {
    sm: "px-4 py-3 text-sm",
    md: "px-5 py-3.5 text-sm",
    icon: "p-2.5",
  };

  const variantClasses = {
    primary:
      "bg-brand-500 text-white shadow-theme-xs hover:bg-brand-600 disabled:bg-brand-300",
    outline:
      "bg-white text-gray-700 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 dark:bg-gray-800 dark:text-gray-400 dark:ring-gray-700 dark:hover:bg-white/[0.03] dark:hover:text-gray-300",
    ghost:
      "bg-transparent text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-white/5",
    danger:
      "bg-error-500 text-white shadow-theme-xs hover:bg-error-600 disabled:bg-error-300",
    link: "bg-transparent p-0 text-brand-600 hover:text-brand-700 hover:underline dark:text-brand-400",
  };

  return (
    <button
      type={type}
      aria-label={ariaLabel}
      aria-busy={loading || undefined}
      className={`inline-flex items-center justify-center gap-2 rounded-lg font-medium transition ${className} ${
        sizeClasses[size]
      } ${variantClasses[variant]} ${isDisabled ? "cursor-not-allowed opacity-50" : ""}`}
      onClick={onClick}
      disabled={isDisabled}
    >
      {loading ? (
        <span
          className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent"
          aria-hidden="true"
        />
      ) : (
        startIcon && <span className="flex shrink-0 items-center">{startIcon}</span>
      )}
      {children}
      {!loading && endIcon && <span className="flex shrink-0 items-center">{endIcon}</span>}
    </button>
  );
};

export default Button;
