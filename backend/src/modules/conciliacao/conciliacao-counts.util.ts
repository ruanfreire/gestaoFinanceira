export type BancoConciliacaoCounts = {
  pendentes: number;
  sem_match: number;
};

export type ConciliacaoCountsResponse = {
  pendentes: number;
  sem_match: number;
  asaas: BancoConciliacaoCounts;
  nubank: BancoConciliacaoCounts;
};

export function sumConciliacaoCounts(
  asaas: BancoConciliacaoCounts,
  nubank: BancoConciliacaoCounts,
): Pick<ConciliacaoCountsResponse, 'pendentes' | 'sem_match'> {
  return {
    pendentes: asaas.pendentes + nubank.pendentes,
    sem_match: asaas.sem_match + nubank.sem_match,
  };
}
