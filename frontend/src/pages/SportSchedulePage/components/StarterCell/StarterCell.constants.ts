export const STARTER_COPY = {
  none: 'TBA',
  /** Who they face and how that rates, on one muted line under the name. */
  matchup: (opponent: string, grade: string, score: number) =>
    `vs ${opponent} · ${grade} (${score.toFixed(0)})`,
} as const;
