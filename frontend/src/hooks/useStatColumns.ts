import { useMemo } from 'react';
import type { StatGroup } from '@/api/sports';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import {
  resetStatColumns,
  selectStatColumns,
  statColumnsScope,
  toggleStatColumn,
} from '@/store/slices/statColumns';

/** The stat columns a user chose for a sport's stat group (shared by leaderboards and game logs). */
export const useStatColumns = (sport: string, group: StatGroup) => {
  const dispatch = useAppDispatch();
  const scope = statColumnsScope(sport, group.key);
  const selectedKeys =
    useAppSelector((state) => selectStatColumns(state, scope)) ??
    group.defaultStats;

  const columns = useMemo(
    () => group.stats.filter((stat) => selectedKeys.includes(stat.key)),
    [group.stats, selectedKeys],
  );

  return {
    columns,
    selectedKeys,
    toggle: (stat: string) =>
      dispatch(
        toggleStatColumn({
          scope,
          stat,
          defaults: group.defaultStats,
          order: group.stats.map(({ key }) => key),
        }),
      ),
    reset: () => dispatch(resetStatColumns(scope)),
  };
};
