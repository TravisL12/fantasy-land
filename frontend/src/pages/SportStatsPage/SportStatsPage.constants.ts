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

