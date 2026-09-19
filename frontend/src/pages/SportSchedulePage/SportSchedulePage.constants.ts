export const SCHEDULE_PARAMS = {
  season: 'season',
  startDate: 'startDate',
  endDate: 'endDate',
  week: 'week',
} as const;

export const SCHEDULE_COPY = {
  caption: 'Games in this window',
  empty: 'No games in that window.',
  explainer:
    'Fixtures, played and upcoming. A score only appears once a game is final — a live game’s running score is deliberately left out.',
  starterExplainer: ' Announced starters carry how tough their opponent rates.',
  /** Away side first, the way a fixture is written. */
  game: (away: string, home: string) => `${away} @ ${home}`,
  score: (away: number, home: number) => `${away}–${home}`,
  fromLabel: 'From',
  toLabel: 'To',
  weekLabel: 'Week',
  allWeeks: 'All weeks',
  columns: {
    date: 'Date',
    week: 'Week',
    game: 'Game',
    status: 'Status',
    away: 'Away starter',
    home: 'Home starter',
    score: 'Score',
  },
} as const;
