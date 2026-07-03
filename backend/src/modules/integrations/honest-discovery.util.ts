import { extractNotaItemsFromJson } from '../importacoes/nf-json.mapper';

export type HonestDiscoveredEndpoint = {
  id: string;
  url: string;
  method: string;
  label: string;
  nota_count: number;
  score: number;
  captured_at: string;
  source: 'scan' | 'browse' | 'manual';
  confirmed?: boolean;
};

export function scoreHonestPayload(json: unknown): { notaCount: number; score: number } {
  const notaCount = extractNotaItemsFromJson(json).length;
  if (notaCount > 0) {
    return { notaCount, score: Math.min(100, 60 + Math.min(notaCount, 40)) };
  }

  const text = JSON.stringify(json).toLowerCase();
  let score = 0;
  if (text.includes('nf_lista')) score += 35;
  if (text.includes('tomador_nome')) score += 20;
  if (text.includes('codigo_servico')) score += 15;
  if (text.includes('__typename')) score += 10;
  if (text.includes('"empresa"')) score += 10;
  return { notaCount: 0, score };
}

export type HonestEmpresaOption = {
  id: number;
  nome: string;
  cpfcnpj: string;
};

export function normalizeDocument(value: string): string {
  return value.replace(/\D/g, '');
}

export function extractHonestEmpresas(json: unknown): HonestEmpresaOption[] {
  if (!json || typeof json !== 'object') return [];
  const root = json as Record<string, unknown>;
  const data = root.data && typeof root.data === 'object' ? (root.data as Record<string, unknown>) : root;
  const list = data.empresa_list ?? data.empresas;
  if (!Array.isArray(list)) return [];

  return list
    .map((item) => {
      if (!item || typeof item !== 'object') return null;
      const record = item as Record<string, unknown>;
      const id = Number(record.id);
      if (!Number.isFinite(id) || id <= 0) return null;
      return {
        id,
        nome: String(record.nome ?? '').trim(),
        cpfcnpj: String(record.cpfcnpj ?? '').trim(),
      };
    })
    .filter((item): item is HonestEmpresaOption => item != null);
}

export function matchHonestEmpresaByCnpj(
  empresas: HonestEmpresaOption[],
  cnpj: string,
): HonestEmpresaOption | undefined {
  const target = normalizeDocument(cnpj);
  if (!target) return undefined;
  return empresas.find((item) => normalizeDocument(item.cpfcnpj) === target);
}

export function buildHonestEmpresaNfListaPath(empresaId: number): string {
  return `/u/empresa/${empresaId}/nf/lista`;
}

export function buildHonestBrowsePaths(empresaId?: number, entryPath = '/u/acesso'): string[] {
  const paths = [entryPath, '/u/selecionar-empresa'];
  if (empresaId) {
    paths.push(
      buildHonestEmpresaNfListaPath(empresaId),
      `/u/empresa/${empresaId}/nf`,
      `/u/empresa/${empresaId}`,
    );
  }
  return paths;
}

export function buildHonestEmpresasRequest() {
  const query = `query Empresas {
  empresa_list {
    id
    nome
    cpfcnpj
  }
}`;
  return { operationName: 'Empresas', variables: {}, query };
}

export function buildHonestGraphqlUrl(baseUrl: string): string {
  return `${baseUrl.replace(/\/$/, '')}/api/v1/graphql`;
}

export function buildHonestGraphqlReferer(empresaId: number): string {
  return `https://honest.com.br${buildHonestEmpresaNfListaPath(empresaId)}`;
}

export function buildHonestGraphqlNfRequest(empresaId: number, limit = 1000, offset = 0) {
  const query = `query NfsEmitidas($empresaId: Int!, $query: NfListaQuery) {
  empresa(id: $empresaId) {
    id
    nf_lista(query: $query) {
      items {
        id
        numero
        tomador_nome
        codigo_servico
        valor
        data_emissao
        status_emissao
        rpsId
        link_prefeitura
        __typename
      }
      offset
      total
      hasMore
      __typename
    }
    __typename
  }
}`;
  return {
    operationName: 'NfsEmitidas',
    variables: { empresaId, query: { limit, offset } },
    query,
  };
}

export function isHonestGraphqlNfResponse(json: unknown): boolean {
  if (!json || typeof json !== 'object') return false;
  const root = json as Record<string, unknown>;
  if (root.status && root.status !== 'success') return false;
  const data = root.data;
  if (!data || typeof data !== 'object') return false;
  const empresa = (data as Record<string, unknown>).empresa;
  if (!empresa || typeof empresa !== 'object') return false;
  const nfLista = (empresa as Record<string, unknown>).nf_lista;
  if (!nfLista || typeof nfLista !== 'object') return false;
  return Array.isArray((nfLista as Record<string, unknown>).items);
}

export function countHonestGraphqlNfItems(json: unknown): number {
  if (!isHonestGraphqlNfResponse(json)) return 0;
  const data = (json as Record<string, unknown>).data as Record<string, unknown>;
  const empresa = data.empresa as Record<string, unknown>;
  const nfLista = empresa.nf_lista as Record<string, unknown>;
  return Array.isArray(nfLista.items) ? nfLista.items.length : 0;
}

export function buildProbePaths(baseUrl: string): string[] {
  const base = baseUrl.replace(/\/$/, '');
  return [
    `${base}/api/notas`,
    `${base}/api/nfs`,
    `${base}/api/nf`,
    `${base}/api/export/notas`,
    `${base}/api/export/json`,
    `${base}/api/v1/notas`,
    `${base}/export/notas`,
    `${base}/export/json`,
    `${base}/api/v1/graphql`,
    `${base}/api/v2/graphql`,
  ];
}

export function mergeDiscoveredEndpoints(
  current: HonestDiscoveredEndpoint[],
  incoming: Omit<HonestDiscoveredEndpoint, 'id'> & { id?: string },
): HonestDiscoveredEndpoint[] {
  const id = incoming.id ?? Buffer.from(`${incoming.method}:${incoming.url}`).toString('base64url').slice(0, 24);
  const existingIndex = current.findIndex((item) => item.url === incoming.url && item.method === incoming.method);
  const next: HonestDiscoveredEndpoint = {
    id,
    url: incoming.url,
    method: incoming.method,
    label: incoming.label,
    nota_count: incoming.nota_count,
    score: incoming.score,
    captured_at: incoming.captured_at,
    source: incoming.source,
    confirmed: incoming.confirmed ?? existingIndex >= 0 ? current[existingIndex]?.confirmed : false,
  };

  if (existingIndex >= 0) {
    const copy = [...current];
    const prev = copy[existingIndex];
    copy[existingIndex] = {
      ...next,
      confirmed: prev.confirmed,
      score: Math.max(prev.score, next.score),
      nota_count: Math.max(prev.nota_count, next.nota_count),
    };
    return copy.sort((a, b) => b.score - a.score);
  }

  return [next, ...current].sort((a, b) => b.score - a.score).slice(0, 30);
}
