import { Navigate, Outlet, useLocation } from 'react-router';
import type { AuthRedirectState } from '@/components/RequireAuth';
import { useCurrentUser } from '@/hooks';
import { ROUTES } from '@/router/routes.constants';

/** Layout route for login/register: once a session exists, returns to where the user was headed. */
export const RequireGuest = () => {
  const { user, isLoading } = useCurrentUser();
  const state = useLocation().state as AuthRedirectState | null;

  if (isLoading) return null;
  if (user) return <Navigate to={state?.from ?? ROUTES.home} replace />;
  return <Outlet />;
};
