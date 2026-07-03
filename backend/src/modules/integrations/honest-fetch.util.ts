export type HonestFetchResult = {
  url: string;
  ok: boolean;
  json?: unknown;
  error?: string;
};

export async function fetchHonestJson(
  url: string,
  timeoutMs: number,
): Promise<HonestFetchResult> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        Accept: 'application/json',
        'User-Agent': 'GestaoFinanceira-HonestSync/1.0',
      },
    });

    if (!response.ok) {
      return { url, ok: false, error: `HTTP ${response.status}` };
    }

    const text = await response.text();
    if (!text.trim()) {
      return { url, ok: false, error: 'Resposta vazia' };
    }

    try {
      return { url, ok: true, json: JSON.parse(text) as unknown };
    } catch {
      return { url, ok: false, error: 'JSON inválido' };
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Falha na requisição';
    return { url, ok: false, error: message };
  } finally {
    clearTimeout(timeout);
  }
}

/** Agrupa payloads Honest no formato esperado pelo importador de notas. */
function asNfListaEntries(nfLista: unknown): Record<string, unknown>[] {
  if (nfLista == null) return [];
  if (Array.isArray(nfLista)) {
    return nfLista.filter((entry): entry is Record<string, unknown> => entry != null && typeof entry === 'object');
  }
  if (typeof nfLista === 'object') {
    const record = nfLista as Record<string, unknown>;
    if (Array.isArray(record.items)) return [record];
  }
  return [];
}

export function mergeHonestPayloads(payloads: unknown[]): unknown {
  const empresaMap = new Map<string, Record<string, unknown>>();

  for (const payload of payloads) {
    const root = payload as Record<string, unknown> | null | undefined;
    const dataItems = Array.isArray(root?.data) ? root.data : root?.data ? [root.data] : [payload];

    for (const dataItem of dataItems) {
      const dataRecord = dataItem as Record<string, unknown>;
      const empresas = Array.isArray(dataRecord?.empresa)
        ? dataRecord.empresa
        : dataRecord?.empresa
          ? [dataRecord.empresa]
          : [];

      for (const empresa of empresas) {
        const empresaRecord = empresa as Record<string, unknown>;
        const key = String(empresaRecord.id ?? empresaRecord.codigo ?? empresaRecord.cnpj ?? empresaRecord.nome ?? 'default');
        const existing = empresaMap.get(key) ?? { ...empresaRecord, nf_lista: [] };
        const existingListas = Array.isArray(existing.nf_lista) ? [...existing.nf_lista] : [];

        for (const nfLista of asNfListaEntries(empresaRecord.nf_lista)) {
          const lista = nfLista;
          const items = Array.isArray(lista.items) ? lista.items : [];
          if (items.length === 0) continue;

          const match = existingListas.find((entry) => {
            const record = entry as Record<string, unknown>;
            return record.id === lista.id || record.competencia === lista.competencia;
          }) as Record<string, unknown> | undefined;

          if (match) {
            const current = Array.isArray(match.items) ? match.items : [];
            match.items = [...current, ...items];
          } else {
            existingListas.push({ ...lista, items: [...items] });
          }
        }

        existing.nf_lista = existingListas;
        empresaMap.set(key, existing);
      }
    }
  }

  return { data: [{ empresa: [...empresaMap.values()] }] };
}
