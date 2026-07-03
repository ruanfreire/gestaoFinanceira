import { Pencil, Trash2 } from "lucide-react";
import { Button, Typography } from "@/design-system/atoms";
import { cn } from "@/design-system/lib/cn";

export function ProfileChoiceCard({
  title,
  description,
  onSelect,
  onEdit,
  onDelete,
  className,
}: {
  title: string;
  description?: string;
  onSelect: () => void;
  onEdit: () => void;
  onDelete: () => void;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "relative rounded-xl border border-border bg-card transition-default hover:border-primary hover:bg-primary-subtle/30",
        className,
      )}
    >
      <button type="button" onClick={onSelect} className="w-full p-4 pr-20 text-left sm:p-6 sm:pr-24">
        <Typography variant="subtitle">{title}</Typography>
        {description && (
          <Typography variant="caption" className="mt-1 block">
            {description}
          </Typography>
        )}
      </button>
      <div className="absolute right-2 top-2 flex gap-0.5 sm:right-3 sm:top-3">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          aria-label="Editar banco salvo"
          onClick={(event) => {
            event.stopPropagation();
            onEdit();
          }}
        >
          <Pencil className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-danger hover:text-danger"
          aria-label="Excluir banco salvo"
          onClick={(event) => {
            event.stopPropagation();
            onDelete();
          }}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
