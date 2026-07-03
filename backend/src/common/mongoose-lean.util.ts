/** Normaliza retorno de findOne/findById().lean() com Model<any>. */
export function asLeanOne<T>(result: unknown): T | null {
  if (result == null) return null;
  if (Array.isArray(result)) return (result[0] as T | undefined) ?? null;
  return result as T;
}

/** Normaliza retorno de find().lean() com Model<any>. */
export function asLeanMany<T>(result: unknown): T[] {
  if (result == null) return [];
  return (Array.isArray(result) ? result : [result]) as T[];
}

/** Normaliza lean de Model<any> para documento único tipado como record. */
export function asLeanRecord(result: unknown): Record<string, unknown> | null {
  return asLeanOne<Record<string, unknown>>(result);
}
