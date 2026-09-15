import { baseApi } from '@/api/baseApi';
import type {
  LoginRequest,
  RegisterRequest,
  SessionResponse,
} from './auth.types';

interface SessionCacheApi<TData> {
  dispatch: (action: unknown) => unknown;
  queryFulfilled: Promise<{ data: TData }>;
}

// Write the new session straight into the `getMe` cache so the UI flips
// between logged-in and logged-out without a refetch.
const syncSession = async <TData>(
  { dispatch, queryFulfilled }: SessionCacheApi<TData>,
  toSession: (data: TData) => SessionResponse,
) => {
  try {
    const { data } = await queryFulfilled;
    dispatch(authApi.util.upsertQueryData('getMe', undefined, toSession(data)));
  } catch {
    // Failed requests leave the current session untouched.
  }
};

export const authApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    getMe: build.query<SessionResponse, void>({
      query: () => '/auth/me',
    }),
    login: build.mutation<SessionResponse, LoginRequest>({
      query: (body) => ({ url: '/auth/login', method: 'POST', body }),
      onQueryStarted: (_arg, api) => syncSession(api, (session) => session),
    }),
    register: build.mutation<SessionResponse, RegisterRequest>({
      query: (body) => ({ url: '/auth/register', method: 'POST', body }),
      onQueryStarted: (_arg, api) => syncSession(api, (session) => session),
    }),
    logout: build.mutation<void, void>({
      query: () => ({ url: '/auth/logout', method: 'POST' }),
      onQueryStarted: (_arg, api) => syncSession(api, () => ({ user: null })),
    }),
  }),
});

export const {
  useGetMeQuery,
  useLoginMutation,
  useRegisterMutation,
  useLogoutMutation,
} = authApi;
