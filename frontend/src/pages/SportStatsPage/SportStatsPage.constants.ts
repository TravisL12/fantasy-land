import { ROUTES } from '@/router/routes.constants';

export const PAGE_SIZE = 50;
export const SEARCH_DEBOUNCE_MS = 300;

export const STATS_PARAMS = {
  season: 'season',
  week: 'week',
  group: 'group',
  position: 'position',
  kind: 'kind',
  scoring: 'scoring',
  sort: 'sort',
  order: 'order',
  minGames: 'minGames',
  search: 'q',
  page: 'page',
} as const;

export const SORT_KEYS = {
  fantasyPoints: 'fantasyPoints',
  fantasyPointsPerGame: 'fantasyPointsPerGame',
  gamesPlayed: 'gamesPlayed',
  name: 'name',
} as const;

export const SPORT_STATS_COPY = {
  title: (league: string) => `${league} stats`,
  subtitle: (source: string) =>
    `Data from ${source}. Click a column to sort, or a player for their game log.`,
  back: { to: ROUTES.sports, label: 'All sports' },
  loading: 'Loading…',
  notFound: 'That sport isn’t available.',
} as const;
