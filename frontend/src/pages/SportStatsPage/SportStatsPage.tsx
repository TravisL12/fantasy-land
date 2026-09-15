import { useParams } from 'react-router';
import {
  type SportCatalog,
  useGetSportStatsQuery,
  useSportCatalog,
} from '@/api/sports';
import { PageHeader } from '@/components/PageHeader';
import { STATUS_VARIANTS, StatusMessage } from '@/components/StatusMessage';
import { useStatColumns } from '@/hooks';
import { getApiErrorMessage } from '@/utils';
import { Pagination } from './components/Pagination';
import { StatColumnPicker } from './components/StatColumnPicker';
import { StatsTable } from './components/StatsTable';
import { StatsToolbar } from './components/StatsToolbar';
import { PAGE_SIZE, SPORT_STATS_COPY } from './SportStatsPage.constants';
import { useStatsFilters } from './SportStatsPage.hooks';
import { Layout } from './SportStatsPage.styles';

export const SportStatsPage = () => {
  const { sport } = useParams();
  const { catalog, isLoading, isError } = useSportCatalog(sport);

  if (isLoading)
    return <StatusMessage>{SPORT_STATS_COPY.loading}</StatusMessage>;
  if (isError || !catalog) {
    return (
      <PageHeader
        title={SPORT_STATS_COPY.notFound}
        back={SPORT_STATS_COPY.back}
      />
    );
  }
  // Keyed so switching sports resets any per-sport local state.
  return <SportStatsExplorer key={catalog.key} catalog={catalog} />;
};

const SportStatsExplorer = ({ catalog }: { catalog: SportCatalog }) => {
  const { filters, setFilters, setGroup, setPage, toggleSort } =
    useStatsFilters(catalog);
  const statColumns = useStatColumns(catalog.key, filters.group);

  const offset = (filters.page - 1) * PAGE_SIZE;
  const { data, error, isFetching } = useGetSportStatsQuery({
    sport: catalog.key,
    season: filters.season,
    week: filters.week,
    group: filters.group.key,
    position: filters.position,
    kind: filters.kind,
    scoring: filters.scoring,
    sort: filters.sort,
    order: filters.order,
    minGames: filters.minGames || undefined,
    search: filters.search || undefined,
    limit: PAGE_SIZE,
    offset,
  });

  return (
    <Layout>
      <PageHeader
        title={SPORT_STATS_COPY.title(catalog.league)}
        subtitle={SPORT_STATS_COPY.subtitle(catalog.dataSource.name)}
        back={SPORT_STATS_COPY.back}
      />
      <StatsToolbar
        catalog={catalog}
        filters={filters}
        onChange={setFilters}
        onGroupChange={setGroup}
      />
      <StatColumnPicker
        stats={filters.group.stats}
        selectedKeys={statColumns.selectedKeys}
        onToggle={statColumns.toggle}
        onReset={statColumns.reset}
      />
      {error ? (
        <StatusMessage variant={STATUS_VARIANTS.error}>
          {getApiErrorMessage(error)}
        </StatusMessage>
      ) : (
        <>
          <StatsTable
            sport={catalog.key}
            filters={filters}
            statColumns={statColumns.columns}
            rows={data?.rows ?? []}
            offset={offset}
            isFetching={isFetching}
            onSort={toggleSort}
          />
          <Pagination
            page={filters.page}
            pageSize={PAGE_SIZE}
            total={data?.total ?? 0}
            onPageChange={setPage}
          />
        </>
      )}
    </Layout>
  );
};
