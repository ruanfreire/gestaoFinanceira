import { Upload } from "lucide-react";
import { Typography } from "@/design-system/atoms";
import { cn } from "@/design-system/lib/cn";

export function UploadArea({
  accept,
  onFile,
  disabled,
  label,
  hint,
}: {
  accept: string;
  onFile: (file: File) => void;
  disabled?: boolean;
  label: string;
  hint?: string;
}) {
  return (
    <label
      className={cn(
        "flex min-h-40 cursor-pointer flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed border-border bg-surface-sunken p-6 text-center transition-default",
        "hover:border-primary hover:bg-primary-subtle/50",
        disabled && "pointer-events-none opacity-50",
      )}
    >
      <Upload className="h-10 w-10 text-muted-foreground" aria-hidden />
      <div>
        <Typography variant="subtitle">{label}</Typography>
        {hint && (
          <Typography variant="caption" tone="muted" className="mt-1">
            {hint}
          </Typography>
        )}
      </div>
      <input
        type="file"
        accept={accept}
        className="sr-only"
        disabled={disabled}
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) onFile(file);
          e.target.value = "";
        }}
      />
    </label>
  );
}
