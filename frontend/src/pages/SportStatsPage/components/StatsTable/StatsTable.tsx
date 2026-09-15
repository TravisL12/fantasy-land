import { useMemo } from 'react';
import type { StatLeaderRow } from '@/api/sports';
import { ALIGN, DataTable, type DataTableColumn } from '@/components/DataTable';
import { buildPlayerStatsPath } from '@/router/routes.constants';
import { formatPoints, formatStat } from '@/utils';
import { SORT_KEYS } from '../../SportStatsPage.constants';
import {
  COLUMN_KEYS,
  playerMeta,
  STATS_TABLE_COPY,
} from './StatsTable.constants';
import { PlayerCell, PlayerLink, PlayerMeta, Rank } from './StatsTable.styles';
import type { StatsTableProps } from './StatsTable.types';

export const StatsTable = ({
  sport,
  filters,
  statColumns,
  rows,
  offset,
  isFetching,
  onSort,
}: StatsTableProps) => {
  const columns = useMemo((): DataTableColumn<
    StatLeaderRow & { rank: number }
  >[] => {
    // Leaderboard player links keep the season/group/scoring context.
    const playerSearch = {
      season: filters.season,
      group: filters.group.key,
      scoring: filters.scoring,
    };

    return [
      {
        key: COLUMN_KEYS.rank,
        header: STATS_TABLE_COPY.rank,
        align: ALIGN.left,
        render: (row) => <Rank>{row.rank}</Rank>,
      },
      {
        key: COLUMN_KEYS.player,
        header: STATS_TABLE_COPY.player,
        align: ALIGN.left,
        sortable: true,
        sticky: true,
        render: ({ player }) => (
          <PlayerCell>
            <PlayerLink
              to={buildPlayerStatsPath(sport, player.id, playerSearch)}
            >
              {player.name}
            </PlayerLink>
            <PlayerMeta>{playerMeta(player.team, player.position)}</PlayerMeta>
          </PlayerCell>
        ),
      },
      {
        key: SORT_KEYS.fantasyPoints,
        header: STATS_TABLE_COPY.points,
        title: STATS_TABLE_COPY.pointsTitle,
        sortable: true,
        highlight: true,
        render: (row) => formatPoints(row.fantasyPoints),
      },
      {
        key: SORT_KEYS.fantasyPointsPerGame,
        header: STATS_TABLE_COPY.perGame,
        title: STATS_TABLE_COPY.perGameTitle,
        sortable: true,
        render: (row) => formatPoints(row.fantasyPointsPerGame),
      },
      {
        key: SORT_KEYS.gamesPlayed,
        header: STATS_TABLE_COPY.games,
        title: STATS_TABLE_COPY.gamesTitle,
        sortable: true,
        render: (row) => row.gamesPlayed,
      },
      ...statColumns.map(
        (stat): DataTableColumn<StatLeaderRow & { rank: number }> => ({
          key: stat.key,
          header: stat.abbr,
          title: stat.label,
          sortable: true,
          render: (row) => formatStat(row.stats[stat.key], stat.format),
        }),
      ),
    ];
  }, [sport, filters.season, filters.group.key, filters.scoring, statColumns]);

  const rankedRows = rows.map((row, index) => ({
    ...row,
    rank: offset + index + 1,
  }));

  return (
    <DataTable
      caption={STATS_TABLE_COPY.caption}
      columns={columns}
      rows={rankedRows}
      getRowKey={(row) => row.player.id}
      sort={{ key: filters.sort, order: filters.order }}
      onSort={(key) =>
        onSort(
          key,
          statColumns.find((stat) => stat.key === key),
        )
      }
      emptyMessage={STATS_TABLE_COPY.empty}
      isFetching={isFetching}
    />
  );
};
