export const PLAYER_PARAMS = {
  season: 'season',
  group: 'group',
  scoring: 'scoring',
} as const;

export const PLAYER_STATS_COPY = {
  loading: 'Loading player…',
  back: (league: string) => `${league} stats`,
  subtitle: (position: string | null, team: string | null, season: string) =>
    [position, team, `${season} season`].filter(Boolean).join(' · '),
  notFound: 'Player not found',
  season: 'Season',
  scoring: 'Scoring',
} as const;
