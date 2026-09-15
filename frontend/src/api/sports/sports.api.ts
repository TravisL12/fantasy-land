import { baseApi } from '@/api/baseApi';
import type {
  PlayerStatsQuery,
  PlayerStatsResponse,
  SportCatalog,
  SportKey,
  StatsQuery,
  StatsResponse,
} from './sports.types';

export const sportsApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    getSports: build.query<SportCatalog[], void>({
      query: () => '/sports',
    }),
    getSportStats: build.query<StatsResponse, StatsQuery>({
      query: ({ sport, ...params }) => ({
        url: `/sports/${sport}/stats`,
        params,
      }),
    }),
    getPlayerStats: build.query<PlayerStatsResponse, PlayerStatsQuery>({
      query: ({ sport, playerId, ...params }) => ({
        url: `/sports/${sport}/players/${playerId}/stats`,
        params,
      }),
    }),
  }),
});

export const {
  useGetSportsQuery,
  useGetSportStatsQuery,
  useGetPlayerStatsQuery,
} = sportsApi;

/** One sport's catalog, read from the shared sports list cache. */
export const useSportCatalog = (sport: string | undefined) =>
  useGetSportsQuery(undefined, {
    selectFromResult: ({ data, isLoading, isError }) => ({
      catalog: data?.find((c) => c.key === (sport as SportKey)),
      isLoading,
      isError,
    }),
  });
