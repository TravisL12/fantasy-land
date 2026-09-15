import { skipToken } from '@reduxjs/toolkit/query';
import { useParams } from 'react-router';
import { useGetPlayerStatsQuery, useSportCatalog } from '@/api/sports';
import { PageHeader } from '@/components/PageHeader';
import { Select } from '@/components/Select';
import { STATUS_VARIANTS, StatusMessage } from '@/components/StatusMessage';
import { useSearchParamsState } from '@/hooks';
import { buildSportStatsPath } from '@/router/routes.constants';
import { getApiErrorMessage } from '@/utils';
import { GameLogTable } from './components/GameLogTable';
import { PointsSummary } from './components/PointsSummary';
import { PLAYER_PARAMS, PLAYER_STATS_COPY } from './PlayerStatsPage.constants';
import { Controls, Layout } from './PlayerStatsPage.styles';

export const PlayerStatsPage = () => {
  const { sport, playerId } = useParams();
  const { catalog, isLoading: isCatalogLoading } = useSportCatalog(sport);
  const { params, update } = useSearchParamsState();

  const { data, error, isFetching } = useGetPlayerStatsQuery(
    catalog && playerId
      ? {
          sport: catalog.key,
          playerId,
          season: params.get(PLAYER_PARAMS.season) ?? undefined,
          group: params.get(PLAYER_PARAMS.group) ?? undefined,
          scoring: params.get(PLAYER_PARAMS.scoring) ?? undefined,
        }
      : skipToken,
  );

  if (isCatalogLoading || (!data && isFetching)) {
    return <StatusMessage>{PLAYER_STATS_COPY.loading}</StatusMessage>;
  }
  if (!catalog) return <PageHeader title={PLAYER_STATS_COPY.notFound} />;

  const back = {
    to: buildSportStatsPath(catalog.key),
    label: PLAYER_STATS_COPY.back(catalog.league),
  };
  if (error || !data) {
    return (
      <>
        <PageHeader title={PLAYER_STATS_COPY.notFound} back={back} />
        <StatusMessage variant={STATUS_VARIANTS.error}>
          {getApiErrorMessage(error)}
        </StatusMessage>
      </>
    );
  }

  const group =
    catalog.groups.find((g) => g.key === data.group) ?? catalog.groups[0];

  return (
    <Layout>
      <PageHeader
        title={data.player.name}
        subtitle={PLAYER_STATS_COPY.subtitle(
          data.player.position,
          data.player.team,
          data.season,
        )}
        back={back}
      />
      <Controls>
        <Select
          label={PLAYER_STATS_COPY.season}
          value={data.season}
          options={catalog.seasons.map((season) => ({
            value: season,
            label: season,
          }))}
          onChange={(season) => update({ [PLAYER_PARAMS.season]: season })}
        />
        <Select
          label={PLAYER_STATS_COPY.scoring}
          value={data.scoring}
          options={catalog.scoringPresets.map((p) => ({
            value: p.key,
            label: p.label,
          }))}
          onChange={(scoring) => update({ [PLAYER_PARAMS.scoring]: scoring })}
        />
      </Controls>
      <PointsSummary summary={data.summary} />
      <GameLogTable
        sport={catalog.key}
        group={group}
        entries={data.entries}
        totals={data.totals}
        totalPoints={data.summary.total}
        isFetching={isFetching}
      />
    </Layout>
  );
};
