import { baseApi } from '@/api/baseApi';
import type { HealthResponse } from './health.types';

export const healthApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    getHealth: build.query<HealthResponse, void>({
      query: () => '/health',
    }),
  }),
});

export const { useGetHealthQuery } = healthApi;
