import { nameSimilarity, normalizeName } from '../../common/name-match.util';

export type TomadorMatchInput = {
  nome: string;
  aliases_pagamento?: string[];
};

export function scoreTomadorMatch(tomador: TomadorMatchInput, pagadorNome: string): number {
  const query = pagadorNome.trim();
  if (!query) return 0;

  let best = nameSimilarity(tomador.nome, query);
  for (const alias of tomador.aliases_pagamento ?? []) {
    if (!alias?.trim()) continue;
    best = Math.max(best, nameSimilarity(alias, query));
  }
  return best;
}

export function rankTomadorMatches<T extends TomadorMatchInput & { _id?: unknown }>(
  tomadores: T[],
  pagadorNome: string,
  options: { minScore?: number; limit?: number } = {},
) {
  const minScore = options.minScore ?? 0.5;
  const limit = options.limit ?? 10;

  return tomadores
    .map((tomador) => ({
      tomador,
      score: scoreTomadorMatch(tomador, pagadorNome),
    }))
    .filter((item) => item.score >= minScore)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}

export function normalizeDocumento(value?: string | null): string {
  if (!value) return '';
  return value.replace(/\D/g, '');
}

export function isValidDocumento(value?: string | null): boolean {
  const digits = normalizeDocumento(value);
  return digits.length === 11 || digits.length === 14;
}

export function tomadorGroupKey(nome?: string | null, documento?: string | null): string {
  const doc = normalizeDocumento(documento);
  if (doc) return `doc:${doc}`;
  const normalized = normalizeName(nome ?? '');
  return normalized ? `nome:${normalized}` : '';
}

export function uniqueAliases(values: Array<string | undefined | null>): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const value of values) {
    const trimmed = value?.trim();
    if (!trimmed) continue;
    const key = normalizeName(trimmed);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    result.push(trimmed);
  }
  return result;
}
