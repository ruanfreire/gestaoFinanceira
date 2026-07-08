import {
  amountsEqual,
  AUTO_MATCH_MIN_NAME_SCORE,
  DATE_AUTO_MATCH_WINDOW_DAYS,
  datesAreClose,
  daysBetween,
  nameSimilarity,
} from '../../../common/name-match.util';

export type FreteTituloLean = {
  _id: unknown;
  tomador_nome?: string;
  tomador_documento?: string;
  valor?: number;
  valor_pago?: number;
  data_emissao?: Date | string;
  numero?: string;
  chave_cte?: string;
  status_pagamento?: string;
};

export type ScoredFreteMatch = {
  titulo: FreteTituloLean;
  nameScore: number;
  valueMatch: boolean;
  daysDiff: number | null;
  dateClose: boolean;
  totalScore: number;
};

export type FreteMatchResult =
  | { status_conciliacao: 'conciliado_auto'; frete_titulo_id: string; candidatas_frete_titulo_ids: [] }
  | { status_conciliacao: 'pendente_vinculo'; candidatas_frete_titulo_ids: string[] }
  | { status_conciliacao: 'sem_match'; candidatas_frete_titulo_ids: [] };

const OPEN_FRETE_FILTER = {
  status_pagamento: { $in: ['aguardando_pagamento', 'parcial'] },
};

export { OPEN_FRETE_FILTER };

export function scoreFreteTitulos(
  titulos: FreteTituloLean[],
  payerName: string,
  valor: number,
  paymentDate: Date,
  minNameScore = 0.55,
): ScoredFreteMatch[] {
  const scored: ScoredFreteMatch[] = [];

  for (const titulo of titulos) {
    const saldoAberto = Number(titulo.valor ?? 0) - Number(titulo.valor_pago ?? 0);
    const valueMatch = amountsEqual(saldoAberto, valor) || amountsEqual(Number(titulo.valor ?? 0), valor);
    const nameScore = Math.max(
      nameSimilarity(titulo.tomador_nome || '', payerName),
      nameSimilarity(titulo.tomador_documento || '', payerName),
    );

    if (nameScore < minNameScore && !valueMatch) continue;

    const emission = titulo.data_emissao ? new Date(titulo.data_emissao) : null;
    const daysDiff =
      emission && !Number.isNaN(emission.getTime()) ? daysBetween(paymentDate, emission) : null;
    const dateClose =
      emission && !Number.isNaN(emission.getTime())
        ? datesAreClose(paymentDate, emission, DATE_AUTO_MATCH_WINDOW_DAYS)
        : false;

    const totalScore = nameScore * 0.6 + (valueMatch ? 0.35 : 0) + (dateClose ? 0.05 : 0);

    scored.push({
      titulo,
      nameScore,
      valueMatch,
      daysDiff,
      dateClose,
      totalScore,
    });
  }

  return scored.sort((a, b) => b.totalScore - a.totalScore);
}

export function resolveFreteMatchFromScored(
  scored: ScoredFreteMatch[],
  paymentDate: Date,
): FreteMatchResult {
  const autoEligible = scored.filter((item) => {
    if (!item.valueMatch || item.nameScore < AUTO_MATCH_MIN_NAME_SCORE) return false;
    const emission = item.titulo.data_emissao ? new Date(item.titulo.data_emissao) : null;
    if (!emission || Number.isNaN(emission.getTime())) return false;
    return datesAreClose(paymentDate, emission, DATE_AUTO_MATCH_WINDOW_DAYS);
  });

  if (autoEligible.length === 1) {
    return {
      status_conciliacao: 'conciliado_auto',
      frete_titulo_id: String(autoEligible[0].titulo._id),
      candidatas_frete_titulo_ids: [],
    };
  }

  const valueMatches = scored.filter((s) => s.valueMatch);
  if (valueMatches.length === 1 && valueMatches[0].nameScore >= 0.5) {
    return {
      status_conciliacao: 'conciliado_auto',
      frete_titulo_id: String(valueMatches[0].titulo._id),
      candidatas_frete_titulo_ids: [],
    };
  }

  if (valueMatches.length > 1 || autoEligible.length > 1) {
    const ids = (valueMatches.length ? valueMatches : autoEligible).map((s) => String(s.titulo._id));
    return { status_conciliacao: 'pendente_vinculo', candidatas_frete_titulo_ids: ids };
  }

  if (scored.length > 0) {
    return {
      status_conciliacao: 'pendente_vinculo',
      candidatas_frete_titulo_ids: scored.slice(0, 5).map((s) => String(s.titulo._id)),
    };
  }

  return { status_conciliacao: 'sem_match', candidatas_frete_titulo_ids: [] };
}
