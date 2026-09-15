import type { DataKind, SortOrder, StatGroup } from '@/api/sports';

export interface StatsFilters {
  season: string;
  week: number | undefined;
  group: StatGroup;
  position: string | undefined;
  kind: DataKind;
  scoring: string;
  sort: string;
  order: SortOrder;
  minGames: number;
  search: string;
  page: number;
}

export type StatsFilterChanges = Partial<
  Record<Exclude<keyof StatsFilters, 'page'>, string | number | undefined>
>;
