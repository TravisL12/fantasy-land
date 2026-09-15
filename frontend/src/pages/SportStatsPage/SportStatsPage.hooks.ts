import { useMemo } from 'react';
import type { SportCatalog, StatDefinition } from '@/api/sports';
import { useSearchParamsState } from '@/hooks';
import { SORT_KEYS, STATS_PARAMS } from './SportStatsPage.constants';
import type { StatsFilterChanges, StatsFilters } from './SportStatsPage.types';

const oneOf = <T extends string>(
  value: string | null,
  allowed: readonly T[],
) => (allowed.includes(value as T) ? (value as T) : undefined);

/** Stats explorer filters, parsed from (and written to) the URL with catalog-aware defaults. */
export const useStatsFilters = (catalog: SportCatalog) => {
  const { params, update } = useSearchParamsState();

  const filters = useMemo((): StatsFilters => {
    const get = (key: string) => params.get(key);
    const group =
      catalog.groups.find((g) => g.key === get(STATS_PARAMS.group)) ??
      catalog.groups[0];
    const week = Number(get(STATS_PARAMS.week));

    return {
      group,
      season:
        oneOf(get(STATS_PARAMS.season), catalog.seasons) ??
        catalog.defaultSeason,
      week: catalog.weeks?.includes(week) ? week : undefined,
      position: oneOf(get(STATS_PARAMS.position), group.positions),
      kind:
        oneOf(get(STATS_PARAMS.kind), catalog.dataKinds) ??
        catalog.dataKinds[0],
      scoring:
        oneOf(
          get(STATS_PARAMS.scoring),
          catalog.scoringPresets.map((p) => p.key),
        ) ?? catalog.scoringPresets[0].key,
      sort: get(STATS_PARAMS.sort) ?? SORT_KEYS.fantasyPoints,
      order: get(STATS_PARAMS.order) === 'asc' ? 'asc' : 'desc',
      minGames: Math.max(0, Number(get(STATS_PARAMS.minGames)) || 0),
      search: get(STATS_PARAMS.search) ?? '',
      page: Math.max(1, Number(get(STATS_PARAMS.page)) || 1),
    };
  }, [catalog, params]);

  /** Any filter change returns to the first page. */
  const setFilters = (changes: StatsFilterChanges) =>
    update({ ...changes, [STATS_PARAMS.page]: undefined });

  const setGroup = (group: string) =>
    setFilters({
      group,
      position: undefined,
      sort: undefined,
      order: undefined,
    });

  const setPage = (page: number) =>
    update({ [STATS_PARAMS.page]: page > 1 ? page : undefined });

  /** Same column flips direction; a new column starts at its "best first" order. */
  const toggleSort = (key: string, stat?: StatDefinition) => {
    if (filters.sort === key) {
      setFilters({ order: filters.order === 'desc' ? 'asc' : 'desc' });
      return;
    }
    const ascending = key === SORT_KEYS.name || stat?.lowerIsBetter;
    setFilters({ sort: key, order: ascending ? 'asc' : undefined });
  };

  return { filters, setFilters, setGroup, setPage, toggleSort };
};
