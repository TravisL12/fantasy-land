import type { ScheduledGame } from '@/api/sports';
import { DataTable, type DataTableColumn } from '@/components/DataTable';
import { SeasonSelect } from '@/components/SeasonSelect';
import { Select } from '@/components/Select';
import { SportView } from '@/components/SportView';
import { TextField } from '@/components/TextField';
import { EMPTY_STAT } from '@/utils';
import { StarterCell } from './components/StarterCell';
import { SCHEDULE_COPY, SCHEDULE_PARAMS } from './SportSchedulePage.constants';
import { useSchedule } from './SportSchedulePage.hooks';
import type { ScheduleView } from './SportSchedulePage.types';

const { columns: COLUMNS } = SCHEDULE_COPY;

/**
 * The columns a sport actually has. Football games carry a week and never a
 * starting pitcher; baseball is the other way round. Rendering both sets for
 * both sports would give every NFL row two permanent "TBA" columns.
 */
const buildColumns = ({
  weeks,
  hasStarters,
}: ScheduleView): DataTableColumn<ScheduledGame>[] => [
  { key: 'date', header: COLUMNS.date, sticky: true, render: (row) => row.date },
  ...(weeks
    ? [
        {
          key: 'week',
          header: COLUMNS.week,
          render: (row: ScheduledGame) => row.week ?? EMPTY_STAT,
        },
      ]
    : []),
  {
    key: 'game',
    header: COLUMNS.game,
    render: (row) => SCHEDULE_COPY.game(row.away, row.home),
  },
  { key: 'status', header: COLUMNS.status, render: (row) => row.status },
  ...(hasStarters
    ? [
        {
          key: 'away',
          header: COLUMNS.away,
          render: (row: ScheduledGame) => (
            <StarterCell starter={row.probables.away} />
          ),
        },
        {
          key: 'home',
          header: COLUMNS.home,
          render: (row: ScheduledGame) => (
            <StarterCell starter={row.probables.home} />
          ),
        },
      ]
    : []),
  {
    key: 'score',
    header: COLUMNS.score,
    align: 'right',
    render: (row) =>
      row.score ? SCHEDULE_COPY.score(row.score.away, row.score.home) : EMPTY_STAT,
  },
];

/** The slate: fixtures, announced starters and how each matchup rates. */
export const SportSchedulePage = () => {
  const { catalog, view, update, data, error, isFetching } = useSchedule();

  return (
    <SportView
      explainer={
        <>
          {SCHEDULE_COPY.explainer}
          {!view.weeks && SCHEDULE_COPY.starterExplainer}
        </>
      }
      error={error}
      toolbar={
        <>
          <SeasonSelect
            catalog={catalog}
            value={view.season}
            onChange={(value) => update({ [SCHEDULE_PARAMS.season]: value })}
          />
          {view.weeks && (
            <Select
              label={SCHEDULE_COPY.weekLabel}
              value={view.week}
              options={[
                { value: '', label: SCHEDULE_COPY.allWeeks },
                ...view.weeks.map((value) => ({
                  value: String(value),
                  label: String(value),
                })),
              ]}
              onChange={(value) => update({ [SCHEDULE_PARAMS.week]: value })}
            />
          )}
          {view.showDates && (
            <>
              <TextField
                type="date"
                label={SCHEDULE_COPY.fromLabel}
                value={view.startDate ?? ''}
                onChange={(event) =>
                  update({ [SCHEDULE_PARAMS.startDate]: event.target.value })
                }
              />
              <TextField
                type="date"
                label={SCHEDULE_COPY.toLabel}
                value={view.endDate ?? ''}
                onChange={(event) =>
                  update({ [SCHEDULE_PARAMS.endDate]: event.target.value })
                }
              />
            </>
          )}
        </>
      }
    >
      <DataTable
        caption={SCHEDULE_COPY.caption}
        columns={buildColumns(view)}
        rows={data?.games ?? []}
        getRowKey={(row) => row.gameId}
        emptyMessage={SCHEDULE_COPY.empty}
        isFetching={isFetching}
      />
    </SportView>
  );
};
