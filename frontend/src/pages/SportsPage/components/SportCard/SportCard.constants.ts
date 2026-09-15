export const SPORT_CARD_MIN_WIDTH = '280px';

export const SPORT_CARD_COPY = {
  season: (season: string, week: number | null) =>
    week ? `${season} season · Week ${week}` : `${season} season`,
  source: (name: string) => `Data from ${name}`,
  cta: 'Explore stats →',
} as const;
