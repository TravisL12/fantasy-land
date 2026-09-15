import type { DataKind } from '@/api/sports';

export const ALL_OPTION = '';

export const TOOLBAR_LABELS = {
  group: 'Stat group',
  kind: 'Data',
  season: 'Season',
  week: 'Week',
  position: 'Position',
  scoring: 'Scoring',
  minGames: 'Min games',
  search: 'Player',
  searchPlaceholder: 'Search by name',
} as const;

export const ALL_LABELS = {
  week: 'Full season',
  position: 'All',
  minGames: 'Any',
} as const;

export const KIND_LABELS: Record<DataKind, string> = {
  stats: 'Stats',
  projections: 'Projections',
};

export const MIN_GAMES_OPTIONS = [1, 5, 10, 25, 50, 100];

export const weekLabel = (week: number) => `Week ${week}`;
export const minGamesLabel = (games: number) => `${games}+`;
