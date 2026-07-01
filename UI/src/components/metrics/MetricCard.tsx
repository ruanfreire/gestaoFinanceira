import { ReactNode } from "react";

export type MetricCardProps = {
  label: string;
  value: ReactNode;
  icon?: ReactNode;
  footer?: ReactNode;
  className?: string;
};

export default function MetricCard({
  label,
  value,
  icon,
  footer,
  className = "",
}: MetricCardProps) {
  return (
    <div
      className={`rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] md:p-6 ${className}`}
    >
      {icon && (
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gray-100 dark:bg-gray-800">
          {icon}
        </div>
      )}
      <div className={icon ? "mt-5" : ""}>
        <span className="text-sm text-gray-500 dark:text-gray-400">{label}</span>
        <div className="mt-2 font-bold text-gray-800 text-title-sm dark:text-white/90">{value}</div>
        {footer && <div className="mt-2">{footer}</div>}
      </div>
    </div>
  );
}
