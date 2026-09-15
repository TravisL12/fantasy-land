export const STATS_TABLE_COPY = {
  caption: 'Player stat leaders',
  empty: 'No players match these filters.',
  rank: '#',
  player: 'Player',
  games: 'GP',
  gamesTitle: 'Games played',
  points: 'FPTS',
  pointsTitle: 'Fantasy points',
  perGame: 'FPTS/G',
  perGameTitle: 'Fantasy points per game',
} as const;

export const COLUMN_KEYS = {
  rank: 'rank',
  player: 'name',
} as const;

export const playerMeta = (team: string | null, position: string | null) =>
  [position, team].filter(Boolean).join(' · ');
