import { ScoredNotaMatch } from './name-match.util';

export function mapScoredCandidata(item: ScoredNotaMatch & { nota: Record<string, unknown> }) {
  const nota = item.nota;
  return {
    ...nota,
    _id: String(nota._id ?? ''),
    match: {
      nameScore: item.nameScore,
      valueMatch: item.valueMatch,
      partialMatch: item.partialMatch,
      saldoAberto: item.saldoAberto,
      daysDiff: item.daysDiff,
      dateClose: item.dateClose,
      mesCompetencia: item.mesCompetencia,
      competenciaOffset: item.competenciaOffset,
      competenciaMatch: item.competenciaMatch,
      totalScore: item.totalScore,
    },
  };
}

export function mapScoredCandidatas(
  items: Array<ScoredNotaMatch & { nota: Record<string, unknown> }>,
) {
  return items.map(mapScoredCandidata);
}
