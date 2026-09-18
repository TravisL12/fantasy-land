import {
  type ProbableStarter,
  type ScheduledGame,
  useGetScheduleQuery,
} from '@/api/sports';
import { DataTable, type DataTableColumn } from '@/components/DataTable';
import { SeasonSelect } from '@/components/SeasonSelect';
import { STATUS_VARIANTS, StatusMessage } from '@/components/StatusMessage';
import { TextField } from '@/components/TextField';
import { useSearchParamsState } from '@/hooks';
import { useSportContext } from '@/pages/SportPage';
import { getApiErrorMessage } from '@/utils';
import { SCHEDULE_COPY, SCHEDULE_PARAMS } from './SportSchedulePage.constants';
import {
  Explainer,
  Layout,
  Rating,
  Starter,
  Toolbar,
} from './SportSchedulePage.styles';

const { columns: COLUMNS } = SCHEDULE_COPY;

const starterCell = (starter: ProbableStarter | null) =>
  starter ? (
    <Starter>
      <span>{starter.name}</span>
      {starter.matchup && (
        <Rating>
          vs {starter.opponent} · {starter.matchup.grade} (
          {starter.matchup.score.toFixed(0)})
        </Rating>
      )}
    </Starter>
  ) : (
    SCHEDULE_COPY.noStarter
  );

const columns: DataTableColumn<ScheduledGame>[] = [
  { key: 'date', header: COLUMNS.date, sticky: true, render: (row) => row.date },
  {
    key: 'game',
    header: COLUMNS.game,
    render: (row) => `${row.away} @ ${row.home}`,
  },
  { key: 'status', header: COLUMNS.status, render: (row) => row.status },
  {
    key: 'away',
    header: COLUMNS.away,
    render: (row) => starterCell(row.probables.away),
  },
  {
    key: 'home',
    header: COLUMNS.home,
    render: (row) => starterCell(row.probables.home),
  },
  {
    key: 'score',
    header: COLUMNS.score,
    align: 'right',
    render: (row) =>
      row.score ? `${row.score.away}–${row.score.home}` : '—',
  },
];

/** The slate: fixtures, announced starters and how each matchup rates. */
export const SportSchedulePage = () => {
  const { catalog } = useSportContext();
  const { params, update } = useSearchParamsState();

  const season = params.get(SCHEDULE_PARAMS.season) ?? undefined;
  const startDate = params.get(SCHEDULE_PARAMS.startDate) ?? undefined;
  const endDate = params.get(SCHEDULE_PARAMS.endDate) ?? undefined;

  const { data, error, isFetching } = useGetScheduleQuery({
    sport: catalog.key,
    season,
    startDate,
    endDate,
  });

  return (
    <Layout>
      <Explainer>{SCHEDULE_COPY.explainer}</Explainer>
      <Toolbar>
        <SeasonSelect
          catalog={catalog}
          value={season}
          onChange={(value) => update({ [SCHEDULE_PARAMS.season]: value })}
        />
        <TextField
          type="date"
          label={SCHEDULE_COPY.fromLabel}
          value={startDate ?? data?.startDate ?? ''}
          onChange={(event) =>
            update({ [SCHEDULE_PARAMS.startDate]: event.target.value })
          }
        />
        <TextField
          type="date"
          label={SCHEDULE_COPY.toLabel}
          value={endDate ?? data?.endDate ?? ''}
          onChange={(event) =>
            update({ [SCHEDULE_PARAMS.endDate]: event.target.value })
          }
        />
      </Toolbar>
      {error ? (
        <StatusMessage variant={STATUS_VARIANTS.error}>
          {getApiErrorMessage(error)}
        </StatusMessage>
      ) : (
        <DataTable
          caption={SCHEDULE_COPY.caption}
          columns={columns}
          rows={data?.games ?? []}
          getRowKey={(row) => row.gameId}
          emptyMessage={SCHEDULE_COPY.empty}
          isFetching={isFetching}
        />
      )}
    </Layout>
  );
};
