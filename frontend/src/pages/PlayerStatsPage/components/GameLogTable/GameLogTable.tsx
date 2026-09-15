import { useMemo } from 'react';
import type { GameLogEntry } from '@/api/sports';
import { ALIGN, DataTable, type DataTableColumn } from '@/components/DataTable';
import { useStatColumns } from '@/hooks';
import { formatPoints, formatStat } from '@/utils';
import {
  GAME_LOG_COPY,
  GAME_LOG_KEYS,
  gameLabel,
  opponentLabel,
} from './GameLogTable.constants';
import type { GameLogTableProps } from './GameLogTable.types';

export const GameLogTable = ({
  sport,
  group,
  entries,
  totals,
  totalPoints,
  isFetching,
}: GameLogTableProps) => {
  const { columns: statColumns } = useStatColumns(sport, group);

  const columns = useMemo(
    (): DataTableColumn<GameLogEntry>[] => [
      {
        key: GAME_LOG_KEYS.game,
        header: GAME_LOG_COPY.game,
        align: ALIGN.left,
        render: gameLabel,
        footer: GAME_LOG_COPY.totals,
      },
      {
        key: GAME_LOG_KEYS.opponent,
        header: GAME_LOG_COPY.opponent,
        align: ALIGN.left,
        render: opponentLabel,
      },
      {
        key: GAME_LOG_KEYS.points,
        header: GAME_LOG_COPY.points,
        title: GAME_LOG_COPY.pointsTitle,
        highlight: true,
        render: (entry) => formatPoints(entry.fantasyPoints),
        footer: formatPoints(totalPoints),
      },
      ...statColumns.map((stat): DataTableColumn<GameLogEntry> => ({
        key: stat.key,
        header: stat.abbr,
        title: stat.label,
        render: (entry) => formatStat(entry.stats[stat.key], stat.format),
        footer: stat.summable
          ? formatStat(totals[stat.key], stat.format)
          : undefined,
      })),
    ],
    [statColumns, totals, totalPoints],
  );

  // Most recent games first.
  const rows = useMemo(() => [...entries].reverse(), [entries]);

  return (
    <DataTable
      caption={GAME_LOG_COPY.caption}
      columns={columns}
      rows={rows}
      getRowKey={(entry, index) => `${entry.week ?? entry.date}-${index}`}
      emptyMessage={GAME_LOG_COPY.empty}
      isFetching={isFetching}
    />
  );
};
