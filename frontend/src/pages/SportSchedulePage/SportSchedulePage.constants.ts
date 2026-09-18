export const SCHEDULE_PARAMS = {
  season: 'season',
  startDate: 'startDate',
  endDate: 'endDate',
} as const;

export const SCHEDULE_COPY = {
  caption: 'Games in this window',
  empty: 'No games in that window.',
  explainer:
    'Fixtures with the announced starters and how tough each one’s opponent rates. A score only appears once a game is final — a live game’s running score is deliberately left out.',
  fromLabel: 'From',
  toLabel: 'To',
  columns: {
    date: 'Date',
    game: 'Game',
    status: 'Status',
    away: 'Away starter',
    home: 'Home starter',
    score: 'Score',
  },
  noStarter: 'TBA',
} as const;
