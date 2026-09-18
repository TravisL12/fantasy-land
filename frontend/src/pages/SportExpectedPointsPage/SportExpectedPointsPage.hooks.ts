import { useCallback, useMemo } from 'react';
import type { SortOrder } from '@/api/sports';
import { useSearchParamsState } from '@/hooks';
import {
  DEFAULT_MIN_GAMES,
  EXPECTED_PARAMS,
  EXPECTED_SORT_KEYS,
} from './SportExpectedPointsPage.constants';

const isSortKey = (value: string | null): value is string =>
  !!value && Object.values<string>(EXPECTED_SORT_KEYS).includes(value);

/** Filters live in the URL, so a board someone finds is a board they can send. */
export const useExpectedPointsFilters = () => {
  const { params, update } = useSearchParamsState();

  const filters = useMemo(() => {
    const sort = params.get(EXPECTED_PARAMS.sort);
    const minGames = Number(params.get(EXPECTED_PARAMS.minGames));

    return {
      season: params.get(EXPECTED_PARAMS.season) ?? undefined,
      position: params.get(EXPECTED_PARAMS.position) ?? undefined,
      sort: isSortKey(sort) ? sort : EXPECTED_SORT_KEYS.expectedPointsPerGame,
      order: (params.get(EXPECTED_PARAMS.order) === 'asc'
        ? 'asc'
        : 'desc') as SortOrder,
      minGames: Number.isFinite(minGames) && minGames > 0
        ? minGames
        : DEFAULT_MIN_GAMES,
    };
  }, [params]);

  /** Clicking the sorted column flips it; a new column starts descending. */
  const toggleSort = useCallback(
    (key: string) =>
      update({
        [EXPECTED_PARAMS.sort]: key,
        [EXPECTED_PARAMS.order]:
          filters.sort === key && filters.order === 'desc' ? 'asc' : 'desc',
      }),
    [filters.order, filters.sort, update],
  );

  return { filters, update, toggleSort };
};
