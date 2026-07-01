import Button from "../button/Button";

type PaginationProps = {
  page: number;
  totalPages: number;
  totalItems?: number;
  onPageChange: (page: number) => void;
  disabled?: boolean;
  className?: string;
};

export default function Pagination({
  page,
  totalPages,
  totalItems,
  onPageChange,
  disabled = false,
  className = "",
}: PaginationProps) {
  if (totalPages <= 1 && totalItems == null) return null;

  const safeTotal = Math.max(1, totalPages);

  return (
    <nav
      className={`flex flex-wrap items-center justify-between gap-3 text-sm text-gray-600 dark:text-gray-400 ${className}`}
      aria-label="Paginação"
    >
      <span>
        {totalItems != null && <>{totalItems} registro(s) · </>}
        Página {page} de {safeTotal}
      </span>
      <div className="flex gap-2">
        <Button
          variant="outline"
          size="sm"
          disabled={disabled || page <= 1}
          onClick={() => onPageChange(page - 1)}
        >
          Anterior
        </Button>
        <Button
          variant="outline"
          size="sm"
          disabled={disabled || page >= safeTotal}
          onClick={() => onPageChange(page + 1)}
        >
          Próxima
        </Button>
      </div>
    </nav>
  );
}
