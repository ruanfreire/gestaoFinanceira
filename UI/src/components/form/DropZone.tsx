import { useDropzone, type Accept } from "react-dropzone";
import { ReactNode } from "react";

export type DropZoneProps = {
  onDrop: (files: File[]) => void;
  accept?: Accept;
  maxFiles?: number;
  disabled?: boolean;
  file?: File | null;
  onClear?: () => void;
  title?: string;
  description?: string;
  activeLabel?: string;
  idleLabel?: string;
  browseLabel?: string;
  children?: ReactNode;
  className?: string;
};

export default function DropZone({
  onDrop,
  accept,
  maxFiles = 1,
  disabled = false,
  file,
  onClear,
  title,
  description,
  activeLabel = "Solte o arquivo aqui...",
  idleLabel = "Arraste o arquivo ou clique para selecionar",
  browseLabel = "Selecionar arquivo",
  children,
  className = "",
}: DropZoneProps) {
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept,
    maxFiles,
    disabled,
  });

  return (
    <div className={className}>
      <div
        {...getRootProps()}
        className={`cursor-pointer rounded-xl border-2 border-dashed p-8 text-center transition-colors ${
          disabled ? "cursor-not-allowed opacity-50" : ""
        } ${
          isDragActive
            ? "border-brand-500 bg-brand-50 dark:bg-brand-500/10"
            : "border-gray-300 hover:border-brand-400 dark:border-gray-700"
        }`}
      >
        <input {...getInputProps()} />
        {children ?? (
          <>
            <p className="text-sm text-gray-600 dark:text-gray-300">
              {isDragActive ? activeLabel : idleLabel}
            </p>
            {title && (
              <p className="mt-2 text-sm font-medium text-gray-800 dark:text-white/90">{title}</p>
            )}
            {description && (
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{description}</p>
            )}
            <p className="mt-3 text-sm font-medium text-brand-600 underline dark:text-brand-400">
              {browseLabel}
            </p>
          </>
        )}
      </div>
      {file && (
        <div className="mt-3 flex items-center justify-between gap-2 text-sm">
          <span className="font-medium text-brand-600 dark:text-brand-400">{file.name}</span>
          {onClear && !disabled && (
            <button
              type="button"
              onClick={onClear}
              className="text-gray-500 hover:text-gray-800 dark:text-gray-400"
            >
              Limpar
            </button>
          )}
        </div>
      )}
    </div>
  );
}
