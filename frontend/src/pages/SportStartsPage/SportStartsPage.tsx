import { type StartsReport, useGetStartsQuery } from '@/api/sports';
import { DataTable, type DataTableColumn } from '@/components/DataTable';
import { SeasonSelect } from '@/components/SeasonSelect';
import { STATUS_VARIANTS, StatusMessage } from '@/components/StatusMessage';
import { TextField } from '@/components/TextField';
import { useSearchParamsState } from '@/hooks';
import { useSportContext } from '@/pages/SportPage';
import { getApiErrorMessage } from '@/utils';
import {
  CONFIDENCE_TONES,
  STARTS_COPY,
  STARTS_PARAMS,
} from './SportStartsPage.constants';
import {
  Explainer,
  Layout,
  Note,
  Start,
  Starts,
  Toolbar,
} from './SportStartsPage.styles';

const { columns: COLUMNS } = STARTS_COPY;

const columns: DataTableColumn<StartsReport>[] = [
  {
    key: 'player',
    header: COLUMNS.player,
    sticky: true,
    render: (row) => row.player.name,
  },
  { key: 'team', header: COLUMNS.team, render: (row) => row.player.team ?? '—' },
  {
    key: 'starts',
    header: COLUMNS.starts,
    align: 'right',
    highlight: true,
    render: (row) => row.starts.length,
  },
  {
    key: 'confirmed',
    header: COLUMNS.confirmed,
    align: 'right',
    render: (row) => row.confirmedStarts,
  },
  {
    key: 'matchupScore',
    header: COLUMNS.matchupScore,
    align: 'right',
    render: (row) => row.matchupScore?.toFixed(1) ?? '—',
  },
  {
    key: 'detail',
    header: COLUMNS.detail,
    render: (row) => (
      <Starts>
        {row.starts.map((start) => (
          <Start
            key={`${start.date}-${start.opponent}`}
            $tone={CONFIDENCE_TONES[start.confidence] ?? 'neutral'}
            title={start.confidence}
          >
            {start.date} {start.isHome ? 'vs' : '@'} {start.opponent}
          </Start>
        ))}
      </Starts>
    ),
  },
];

/** Two-start weeks and streaming calls, with confirmed kept apart from projected. */
export const SportStartsPage = () => {
  const { catalog } = useSportContext();
  const { params, update } = useSearchParamsState();

  const season = params.get(STARTS_PARAMS.season) ?? undefined;
  const startDate = params.get(STARTS_PARAMS.startDate) ?? undefined;
  const endDate = params.get(STARTS_PARAMS.endDate) ?? undefined;

  const { data, error, isFetching } = useGetStartsQuery({
    sport: catalog.key,
    season,
    startDate,
    endDate,
  });

  return (
    <Layout>
      <Explainer>{STARTS_COPY.explainer}</Explainer>
      <Toolbar>
        <SeasonSelect
          catalog={catalog}
          value={season}
          onChange={(value) => update({ [STARTS_PARAMS.season]: value })}
        />
        <TextField
          type="date"
          label={STARTS_COPY.fromLabel}
          value={startDate ?? data?.startDate ?? ''}
          onChange={(event) =>
            update({ [STARTS_PARAMS.startDate]: event.target.value })
          }
        />
        <TextField
          type="date"
          label={STARTS_COPY.toLabel}
          value={endDate ?? data?.endDate ?? ''}
          onChange={(event) =>
            update({ [STARTS_PARAMS.endDate]: event.target.value })
          }
        />
      </Toolbar>
      {error ? (
        <StatusMessage variant={STATUS_VARIANTS.error}>
          {getApiErrorMessage(error)}
        </StatusMessage>
      ) : (
        <>
          <DataTable
            caption={STARTS_COPY.caption}
            columns={columns}
            rows={data?.pitchers ?? []}
            getRowKey={(row) => row.player.id}
            emptyMessage={STARTS_COPY.empty}
            isFetching={isFetching}
          />
          {/* What the sweep could not see. Saying so beats a confident half-answer. */}
          {data?.coverageNote && <Note>{data.coverageNote}</Note>}
        </>
      )}
    </Layout>
  );
};
