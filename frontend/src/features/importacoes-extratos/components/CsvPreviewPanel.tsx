import ComponentCard from "@ui/components/common/ComponentCard";
import type { CsvFilePreview } from "../types/importacao-extrato.types";

export function CsvPreviewPanel({ preview }: { preview: CsvFilePreview }) {
  if (!preview.valid) return null;

  return (
    <ComponentCard
      title="Pré-visualização"
      desc={`${preview.lineCount} linha(s) de dados detectada(s) no CSV.`}
    >
      {preview.headers.length > 0 && (
        <p className="mb-2 text-xs text-gray-500 dark:text-gray-400">
          Colunas: {preview.headers.join(" · ")}
        </p>
      )}
      {preview.sampleRows.length > 0 ? (
        <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-800">
          <table className="min-w-full text-xs">
            <thead className="bg-gray-50 dark:bg-gray-900/60">
              <tr>
                {preview.headers.map((header, index) => (
                  <th key={index} className="px-2 py-1.5 text-left font-medium text-gray-600">
                    {header || `Col ${index + 1}`}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {preview.sampleRows.map((row, rowIndex) => (
                <tr key={rowIndex} className="border-t border-gray-100 dark:border-gray-800">
                  {preview.headers.map((_, colIndex) => (
                    <td key={colIndex} className="max-w-[200px] truncate px-2 py-1.5">
                      {row[colIndex] || "—"}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="text-sm text-gray-500">Nenhuma linha de dados além do cabeçalho.</p>
      )}
    </ComponentCard>
  );
}
