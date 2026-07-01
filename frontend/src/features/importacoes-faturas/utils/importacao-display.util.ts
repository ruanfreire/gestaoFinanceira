export function formatDateTime(value?: string): string {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "—" : date.toLocaleString("pt-BR");
}

export function statusLabel(status?: string): string {
  if (status === "finished") return "Concluída";
  if (status === "processing") return "Processando";
  if (status === "failed") return "Falhou";
  return status || "—";
}

export function statusBadgeColor(
  status?: string,
): "success" | "error" | "warning" | "light" {
  if (status === "finished") return "success";
  if (status === "failed") return "error";
  if (status === "processing") return "warning";
  return "light";
}

export function importacaoDisplayName(item: {
  label?: string;
  originalName?: string;
  filename?: string;
  _id?: string;
}): string {
  return item.label || item.originalName || item.filename || item._id || "Importação";
}
