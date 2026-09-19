import { baseApi } from '@/api/baseApi';
import type {
  AvailabilityQuery,
  AvailabilityResponse,
  DateWindowQuery,
  ExpectedPointsQuery,
  ExpectedPointsResponse,
  MatchupsQuery,
  MatchupsResponse,
  PlayerDirectoryQuery,
  PlayerDirectoryResponse,
  PlayerStatsQuery,
  PlayerStatsResponse,
  ScheduleQuery,
  ScheduleResponse,
  SportCatalog,
  SportKey,
  StartsResponse,
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
    getExpectedPoints: build.query<ExpectedPointsResponse, ExpectedPointsQuery>({
      query: ({ sport, ...params }) => ({
        url: `/sports/${sport}/expected-points`,
        params,
      }),
    }),
    getPlayerDirectory: build.query<
      PlayerDirectoryResponse,
      PlayerDirectoryQuery
    >({
      query: ({ sport, ...params }) => ({
        url: `/sports/${sport}/players`,
        params,
      }),
    }),
    getSchedule: build.query<ScheduleResponse, ScheduleQuery>({
      query: ({ sport, ...params }) => ({
        url: `/sports/${sport}/schedule`,
        params,
      }),
    }),
    getStarts: build.query<StartsResponse, DateWindowQuery>({
      query: ({ sport, ...params }) => ({ url: `/sports/${sport}/starts`, params }),
    }),
    getMatchups: build.query<MatchupsResponse, MatchupsQuery>({
      query: ({ sport, ...params }) => ({
        url: `/sports/${sport}/matchups`,
        params,
      }),
    }),
    getAvailability: build.query<AvailabilityResponse, AvailabilityQuery>({
      query: ({ sport, ...params }) => ({
        url: `/sports/${sport}/availability`,
        params,
      }),
    }),
  }),
});

export const {
  useGetSportsQuery,
  useGetSportStatsQuery,
  useGetPlayerStatsQuery,
  useGetExpectedPointsQuery,
  useGetPlayerDirectoryQuery,
  useGetScheduleQuery,
  useGetStartsQuery,
  useGetMatchupsQuery,
  useGetAvailabilityQuery,
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
