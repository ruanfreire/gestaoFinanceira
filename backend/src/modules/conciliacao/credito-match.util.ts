import { NotasService } from '../notas/notas.service';

export type CreditoMatchResult =
  | { status_conciliacao: 'conciliado_auto'; nota_id: string; candidatas_nota_ids: [] }
  | { status_conciliacao: 'pendente_vinculo'; candidatas_nota_ids: string[] }
  | { status_conciliacao: 'sem_match'; candidatas_nota_ids: [] };

export async function resolveCreditoMatch(
  notasService: NotasService,
  payerName: string,
  valor: number,
  paymentDate: Date,
): Promise<CreditoMatchResult> {
  const exactMatches = payerName?.trim()
    ? await notasService.findOpenByNameAndValue(payerName, valor, paymentDate)
    : await notasService.findOpenByValueAndDate(valor, paymentDate);

  if (exactMatches.length === 1) {
    return {
      status_conciliacao: 'conciliado_auto',
      nota_id: String(exactMatches[0]._id),
      candidatas_nota_ids: [],
    };
  }

  if (exactMatches.length > 1) {
    return {
      status_conciliacao: 'pendente_vinculo',
      candidatas_nota_ids: exactMatches.map((n) => String(n._id)),
    };
  }

  const scored = payerName?.trim() ? await notasService.findOpenMatches(payerName, valor, paymentDate) : [];
  if (scored.length > 0) {
    return {
      status_conciliacao: 'pendente_vinculo',
      candidatas_nota_ids: scored.map((s) => String(s.nota._id)),
    };
  }

  return { status_conciliacao: 'sem_match', candidatas_nota_ids: [] };
}
