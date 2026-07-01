import { ScoredNotaMatch } from './name-match.util';

export function mapScoredCandidata(item: ScoredNotaMatch & { nota: Record<string, unknown> }) {
  return {
    ...item.nota,
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
