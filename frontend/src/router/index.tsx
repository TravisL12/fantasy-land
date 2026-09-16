import { createBrowserRouter } from 'react-router';
import { Layout } from '@/components/Layout';
import { RequireAuth } from '@/components/RequireAuth';
import { RequireGuest } from '@/components/RequireGuest';
import { HomePage } from '@/pages/HomePage';
import { LoginPage } from '@/pages/LoginPage';
import { NotFoundPage } from '@/pages/NotFoundPage';
import { PlayerStatsPage } from '@/pages/PlayerStatsPage';
import { RegisterPage } from '@/pages/RegisterPage';
import { SportStatsPage } from '@/pages/SportStatsPage';
import { SportsPage } from '@/pages/SportsPage';
import { ROUTES } from './routes.constants';

export const router = createBrowserRouter([
  {
    element: <Layout />,
    children: [
      {
        element: <RequireAuth />,
        children: [
          { path: ROUTES.home, element: <HomePage /> },
          {
            path: ROUTES.chat,
            // Split out: the markdown renderer is only needed on this route.
            lazy: async () => ({
              Component: (await import('@/pages/ChatPage')).ChatPage,
            }),
          },
          { path: ROUTES.sports, element: <SportsPage /> },
          { path: ROUTES.sportStats, element: <SportStatsPage /> },
          { path: ROUTES.playerStats, element: <PlayerStatsPage /> },
        ],
      },
      {
        element: <RequireGuest />,
        children: [
          { path: ROUTES.login, element: <LoginPage /> },
          { path: ROUTES.register, element: <RegisterPage /> },
        ],
      },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
]);
