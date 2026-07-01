/** NF cancelada na prefeitura — não entra em conciliação de pagamentos. */
export const NOTA_CANCELADA_REGEX = /cancel/i;

export function isNotaCancelada(nota: {
  status?: string | null;
  status_emissao?: string | null;
}): boolean {
  for (const field of [nota.status_emissao, nota.status]) {
    if (field && NOTA_CANCELADA_REGEX.test(String(field).trim())) {
      return true;
    }
  }
  return false;
}

/** Filtro MongoDB: exclui status/status_emissao contendo "cancel" (ex.: CANCELADA). */
export const NOTA_NAO_CANCELADA_FILTER = {
  $nor: [
    { status_emissao: { $regex: /^cancel/i } },
    { status: { $regex: /^cancel/i } },
  ],
};
