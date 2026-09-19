import { type MatchupsResponse, useGetMatchupsQuery } from '@/api/sports';
import { DataTable, type DataTableColumn } from '@/components/DataTable';
import { SeasonSelect } from '@/components/SeasonSelect';
import { SegmentedControl } from '@/components/SegmentedControl';
import { SportView } from '@/components/SportView';
import { useSearchParamsState } from '@/hooks';
import { useSportContext } from '@/pages/SportPage';
import {
  GRADE_TONES,
  MATCHUP_COPY,
  MATCHUP_PARAMS,
  MATCHUP_SIDES,
  SIDE_LABELS,
} from './SportMatchupsPage.constants';
import {
  Fill,
  Grade,
  Meter,
  Metrics,
  Track,
} from './SportMatchupsPage.styles';

type TeamRating = MatchupsResponse['teams'][number];

const { columns: COLUMNS } = MATCHUP_COPY;

const columns: DataTableColumn<TeamRating>[] = [
  { key: 'team', header: COLUMNS.team, sticky: true, render: (row) => row.team },
  {
    key: 'score',
    header: COLUMNS.score,
    highlight: true,
    render: (row) => (
      <Meter>
        <Track>
          <Fill $percent={row.score} $tone={GRADE_TONES[row.grade]} />
        </Track>
        <span>{row.score.toFixed(1)}</span>
      </Meter>
    ),
  },
  {
    key: 'grade',
    header: COLUMNS.grade,
    render: (row) => <Grade $tone={GRADE_TONES[row.grade]}>{row.grade}</Grade>,
  },
  {
    key: 'metrics',
    header: COLUMNS.metrics,
    render: (row) => (
      <Metrics>
        {row.metrics.map(({ label, value }) => `${label} ${value}`).join(' · ')}
      </Metrics>
    ),
  },
];

/** Who is soft to face right now — the streaming and sit/start view. */
export const SportMatchupsPage = () => {
  const { catalog } = useSportContext();
  const { params, update } = useSearchParamsState();

  const season = params.get(MATCHUP_PARAMS.season) ?? undefined;
  const side =
    params.get(MATCHUP_PARAMS.side) === MATCHUP_SIDES.hitting
      ? MATCHUP_SIDES.hitting
      : MATCHUP_SIDES.pitching;

  const { data, error, isFetching } = useGetMatchupsQuery({
    sport: catalog.key,
    season,
    side,
  });

  return (
    <SportView
      explainer={MATCHUP_COPY.explainer}
      error={error}
      toolbar={
        <>
          <SeasonSelect
            catalog={catalog}
            value={season}
            onChange={(value) => update({ [MATCHUP_PARAMS.season]: value })}
          />
          <SegmentedControl
            label={MATCHUP_COPY.sideLabel}
            value={side}
            options={Object.values(MATCHUP_SIDES).map((value) => ({
              value,
              label: SIDE_LABELS[value],
            }))}
            onChange={(value) => update({ [MATCHUP_PARAMS.side]: value })}
          />
        </>
      }
    >
      <DataTable
        caption={MATCHUP_COPY.caption}
        columns={columns}
        rows={data?.teams ?? []}
        getRowKey={(row) => row.team}
        emptyMessage={MATCHUP_COPY.empty}
        isFetching={isFetching}
      />
    </SportView>
  );
};
