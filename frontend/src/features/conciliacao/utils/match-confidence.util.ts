export function matchConfidenceScore(nota: {
  match?: { totalScore?: number; daysDiff?: number | null };
}): number {
  if (nota.match?.totalScore != null) {
    const s = nota.match.totalScore;
    return s <= 1 ? Math.round(s * 100) : Math.round(s);
  }
  const days = Math.abs(nota.match?.daysDiff ?? 99);
  if (days === 0) return 90;
  if (days <= 3) return 75;
  if (days <= 7) return 55;
  return 35;
}
