import { baseApi } from '@/api/baseApi';
import type {
  Dashboard,
  DashboardRun,
  DashboardSave,
  DashboardSpec,
} from './dashboards.types';

const TAG = 'Dashboard' as const;

// The tag is declared here rather than in baseApi so it stays with its endpoints.
export const dashboardsApi = baseApi
  .enhanceEndpoints({ addTagTypes: [TAG] })
  .injectEndpoints({
    endpoints: (build) => ({
      getDashboards: build.query<Dashboard[], void>({
        query: () => '/dashboards',
        providesTags: [TAG],
      }),
      getDashboard: build.query<Dashboard, string>({
        query: (id) => `/dashboards/${id}`,
        providesTags: (_result, _error, id) => [{ type: TAG, id }],
      }),
      /** Fetches every source in a spec. Saved or not — the spec is the input. */
      runDashboard: build.mutation<DashboardRun, DashboardSpec>({
        query: (spec) => ({ url: '/dashboards/run', method: 'POST', body: { spec } }),
      }),
      createDashboard: build.mutation<Dashboard, DashboardSave>({
        query: (body) => ({ url: '/dashboards', method: 'POST', body }),
        invalidatesTags: [TAG],
      }),
      updateDashboard: build.mutation<Dashboard, DashboardSave & { id: string }>({
        query: ({ id, ...body }) => ({
          url: `/dashboards/${id}`,
          method: 'PATCH',
          body,
        }),
        invalidatesTags: (_result, _error, { id }) => [TAG, { type: TAG, id }],
      }),
      deleteDashboard: build.mutation<void, string>({
        query: (id) => ({ url: `/dashboards/${id}`, method: 'DELETE' }),
        invalidatesTags: [TAG],
      }),
    }),
  });

export const {
  useGetDashboardsQuery,
  useGetDashboardQuery,
  useRunDashboardMutation,
  useCreateDashboardMutation,
  useUpdateDashboardMutation,
  useDeleteDashboardMutation,
} = dashboardsApi;
