import {
  type ExpectedPointsRow,
  useGetExpectedPointsQuery,
} from '@/api/sports';
import { DataTable, type DataTableColumn } from '@/components/DataTable';
import { SeasonSelect } from '@/components/SeasonSelect';
import { Select } from '@/components/Select';
import { STATUS_VARIANTS, StatusMessage } from '@/components/StatusMessage';
import { useSportContext } from '@/pages/SportPage';
import { getApiErrorMessage } from '@/utils';
import {
  EXPECTED_COPY,
  EXPECTED_PARAMS,
  EXPECTED_ROW_LIMIT,
  EXPECTED_SORT_KEYS,
} from './SportExpectedPointsPage.constants';
import { useExpectedPointsFilters } from './SportExpectedPointsPage.hooks';
import {
  Delta,
  Explainer,
  Layout,
  Models,
  Toolbar,
} from './SportExpectedPointsPage.styles';

const { columns: COLUMNS, titles: TITLES } = EXPECTED_COPY;

const signed = (value: number) => `${value > 0 ? '+' : ''}${value.toFixed(1)}`;

const columns: DataTableColumn<ExpectedPointsRow>[] = [
  {
    key: 'name',
    header: COLUMNS.player,
    sticky: true,
    render: (row) => row.player.name,
  },
  { key: 'team', header: COLUMNS.team, render: (row) => row.player.team ?? '—' },
  {
    key: 'position',
    header: COLUMNS.position,
    render: (row) => row.player.position ?? '—',
  },
  { key: 'games', header: COLUMNS.games, align: 'right', render: (row) => row.gamesPlayed },
  {
    key: EXPECTED_SORT_KEYS.fantasyPoints,
    header: COLUMNS.points,
    align: 'right',
    sortable: true,
    render: (row) => row.fantasyPoints.toFixed(1),
  },
  {
    key: EXPECTED_SORT_KEYS.pointsPerGame,
    header: COLUMNS.pointsPerGame,
    align: 'right',
    sortable: true,
    render: (row) => row.pointsPerGame.toFixed(1),
  },
  {
    key: EXPECTED_SORT_KEYS.expectedPoints,
    header: COLUMNS.expected,
    title: TITLES.expected,
    align: 'right',
    sortable: true,
    render: (row) => row.expectedPoints.toFixed(1),
  },
  {
    key: EXPECTED_SORT_KEYS.expectedPointsPerGame,
    header: COLUMNS.expectedPerGame,
    title: TITLES.expected,
    align: 'right',
    sortable: true,
    highlight: true,
    render: (row) => row.expectedPointsPerGame.toFixed(1),
  },
  {
    key: EXPECTED_SORT_KEYS.delta,
    header: COLUMNS.delta,
    title: TITLES.delta,
    align: 'right',
    sortable: true,
    render: (row) => (
      <Delta $positive={row.delta >= 0}>{signed(row.delta)}</Delta>
    ),
  },
  {
    key: EXPECTED_SORT_KEYS.deltaPerGame,
    header: COLUMNS.deltaPerGame,
    title: TITLES.delta,
    align: 'right',
    sortable: true,
    render: (row) => (
      <Delta $positive={row.deltaPerGame >= 0}>{signed(row.deltaPerGame)}</Delta>
    ),
  },
  {
    key: EXPECTED_SORT_KEYS.efficiency,
    header: COLUMNS.efficiency,
    title: TITLES.efficiency,
    align: 'right',
    sortable: true,
    render: (row) => row.efficiency?.toFixed(2) ?? '—',
  },
];

const MIN_GAMES_OPTIONS = [0, 1, 3, 5, 8].map((value) => ({
  value: String(value),
  label: value === 0 ? 'Any' : String(value),
}));

/** Usage against production: who is outscoring their chances, and who is not. */
export const SportExpectedPointsPage = () => {
  const { catalog } = useSportContext();
  const { filters, update, toggleSort } = useExpectedPointsFilters();

  const { data, error, isFetching } = useGetExpectedPointsQuery({
    sport: catalog.key,
    season: filters.season,
    position: filters.position,
    sort: filters.sort,
    order: filters.order,
    minGames: filters.minGames,
    limit: EXPECTED_ROW_LIMIT,
  });

  const positions = catalog.groups.flatMap(({ positions: list }) => list);

  return (
    <Layout>
      <Explainer>{EXPECTED_COPY.explainer}</Explainer>
      <Toolbar>
        <SeasonSelect
          catalog={catalog}
          value={filters.season}
          onChange={(season) => update({ [EXPECTED_PARAMS.season]: season })}
        />
        <Select
          label={EXPECTED_COPY.positionLabel}
          value={filters.position ?? ''}
          options={[
            { value: '', label: EXPECTED_COPY.allPositions },
            ...positions.map((position) => ({
              value: position,
              label: position,
            })),
          ]}
          onChange={(position) =>
            update({ [EXPECTED_PARAMS.position]: position })
          }
        />
        <Select
          label={EXPECTED_COPY.minGamesLabel}
          value={String(filters.minGames)}
          options={MIN_GAMES_OPTIONS}
          onChange={(minGames) =>
            update({ [EXPECTED_PARAMS.minGames]: minGames })
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
            caption={EXPECTED_COPY.caption}
            columns={columns}
            rows={data?.rows ?? []}
            getRowKey={(row) => row.player.id}
            sort={{ key: filters.sort, order: filters.order }}
            onSort={toggleSort}
            emptyMessage={EXPECTED_COPY.empty}
            isFetching={isFetching}
          />
          {!!data?.models.length && (
            <Models>
              <span>{EXPECTED_COPY.modelsLabel}</span>
              {data.models.map((model) => (
                <span key={model.position}>
                  {EXPECTED_COPY.model(
                    model.position,
                    model.observations,
                    model.rSquared,
                  )}
                </span>
              ))}
            </Models>
          )}
        </>
      )}
    </Layout>
  );
};
