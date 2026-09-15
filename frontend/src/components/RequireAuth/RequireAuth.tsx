import { Navigate, Outlet, useLocation } from 'react-router';
import { useCurrentUser } from '@/hooks';
import { ROUTES } from '@/router/routes.constants';
import type { AuthRedirectState } from './RequireAuth.types';

/** Layout route: renders children for logged-in users, otherwise sends them to login. */
export const RequireAuth = () => {
  const { user, isLoading } = useCurrentUser();
  const location = useLocation();

  if (isLoading) return null;
  if (!user) {
    const state: AuthRedirectState = { from: location.pathname };
    return <Navigate to={ROUTES.login} state={state} replace />;
  }
  return <Outlet />;
};
