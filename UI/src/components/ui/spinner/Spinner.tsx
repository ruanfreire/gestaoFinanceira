type SpinnerSize = "sm" | "md" | "lg";

const sizeClasses: Record<SpinnerSize, string> = {
  sm: "h-5 w-5 border-2",
  md: "h-8 w-8 border-2",
  lg: "h-12 w-12 border-[3px]",
};

type SpinnerProps = {
  size?: SpinnerSize;
  className?: string;
  label?: string;
};

export default function Spinner({ size = "md", className = "", label = "Carregando" }: SpinnerProps) {
  return (
    <div
      className={`inline-flex flex-col items-center gap-2 ${className}`}
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <span
        className={`inline-block animate-spin rounded-full border-brand-500 border-t-transparent ${sizeClasses[size]}`}
        aria-hidden
      />
      <span className="sr-only">{label}</span>
    </div>
  );
}
