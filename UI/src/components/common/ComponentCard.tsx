interface ComponentCardProps {
  title: string;
  children: React.ReactNode;
  className?: string;
  desc?: string;
  /** Menos padding — ideal para barras de filtro e formulários compactos. */
  compact?: boolean;
  /** Remove padding do corpo — ideal para tabelas que ocupam o card inteiro. */
  flush?: boolean;
}

const ComponentCard: React.FC<ComponentCardProps> = ({
  title,
  children,
  className = "",
  desc = "",
  compact = false,
  flush = false,
}) => {
  return (
    <div
      className={`min-w-0 rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03] ${className}`}
    >
      <div className={compact ? "px-4 py-3" : "px-6 py-5"}>
        <h3 className="text-base font-medium text-gray-800 dark:text-white/90">
          {title}
        </h3>
        {desc && (
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            {desc}
          </p>
        )}
      </div>

      <div
        className={`border-t border-gray-100 dark:border-gray-800 ${
          flush ? "" : compact ? "p-4 sm:p-4" : "p-4 sm:p-6"
        }`}
      >
        {flush ? children : <div className={compact ? "space-y-4" : "space-y-6"}>{children}</div>}
      </div>
    </div>
  );
};

export default ComponentCard;
