import { useRef, useState } from "react";
import { Upload } from "lucide-react";
import { Typography } from "@/design-system/atoms";
import { cn } from "@/design-system/lib/cn";

export function DropzoneHero({
  onFiles,
  disabled,
  label,
  hint,
  accept = ".xml,.zip,.pdf,application/xml,application/zip,application/pdf",
  className,
}: {
  onFiles: (files: File[]) => void;
  disabled?: boolean;
  label: string;
  hint?: string;
  accept?: string;
  className?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);

  const handleFiles = (list: FileList | null) => {
    if (!list?.length) return;
    onFiles(Array.from(list));
    if (inputRef.current) inputRef.current.value = "";
  };

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-2xl border-2 border-dashed transition-default",
        dragOver ? "border-primary bg-primary-subtle/60" : "border-border bg-surface-sunken/80",
        disabled && "pointer-events-none opacity-60",
        className,
      )}
      onDragOver={(e) => {
        e.preventDefault();
        setDragOver(true);
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragOver(false);
        handleFiles(e.dataTransfer.files);
      }}
    >
      <label className="flex min-h-36 cursor-pointer flex-col items-center justify-center gap-3 px-6 py-8 text-center sm:min-h-44">
        <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
          <Upload className="h-7 w-7" aria-hidden />
        </span>
        <div>
          <Typography variant="subtitle">{label}</Typography>
          {hint && (
            <Typography variant="caption" tone="muted" className="mt-1 block max-w-md">
              {hint}
            </Typography>
          )}
        </div>
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          multiple
          className="sr-only"
          disabled={disabled}
          onChange={(e) => handleFiles(e.target.files)}
          aria-label={label}
        />
      </label>
    </div>
  );
}
