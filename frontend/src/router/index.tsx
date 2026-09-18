import { createBrowserRouter } from 'react-router';
import { Layout } from '@/components/Layout';
import { RequireAuth } from '@/components/RequireAuth';
import { RequireGuest } from '@/components/RequireGuest';
import { DashboardPage } from '@/pages/DashboardPage';
import { DashboardsPage } from '@/pages/DashboardsPage';
import { HomePage } from '@/pages/HomePage';
import { LoginPage } from '@/pages/LoginPage';
import { NotFoundPage } from '@/pages/NotFoundPage';
import { PlayerStatsPage } from '@/pages/PlayerStatsPage';
import { RegisterPage } from '@/pages/RegisterPage';
import { SportAvailabilityPage } from '@/pages/SportAvailabilityPage';
import { SportExpectedPointsPage } from '@/pages/SportExpectedPointsPage';
import { SportMatchupsPage } from '@/pages/SportMatchupsPage';
import { SportPage } from '@/pages/SportPage';
import { SportPlayersPage } from '@/pages/SportPlayersPage';
import { SportSchedulePage } from '@/pages/SportSchedulePage';
import { SportStartsPage } from '@/pages/SportStartsPage';
import { SportStatsPage } from '@/pages/SportStatsPage';
import { SportsPage } from '@/pages/SportsPage';
import { ROUTES, SPORT_VIEW_SEGMENTS } from './routes.constants';

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
          { path: ROUTES.dashboards, element: <DashboardsPage /> },
          {
            path: ROUTES.dashboardCreate,
            // Split out with the chat: only the builder needs the markdown renderer.
            lazy: async () => ({
              Component: (await import('@/pages/DashboardBuilderPage'))
                .DashboardBuilderPage,
            }),
          },
          {
            // The same page: with an id it refines that dashboard instead.
            path: ROUTES.dashboardEdit,
            lazy: async () => ({
              Component: (await import('@/pages/DashboardBuilderPage'))
                .DashboardBuilderPage,
            }),
          },
          {
            path: ROUTES.dashboardExamples,
            // Split out: the guide carries its own sample data and is read once.
            lazy: async () => ({
              Component: (await import('@/pages/DashboardExamplesPage'))
                .DashboardExamplesPage,
            }),
          },
          { path: ROUTES.dashboard, element: <DashboardPage /> },
          { path: ROUTES.sports, element: <SportsPage /> },
          {
            // One catalog fetch, the header and the tabs; the children are the
            // datasets this sport supports.
            path: ROUTES.sportStats,
            element: <SportPage />,
            children: [
              { index: true, element: <SportStatsPage /> },
              {
                path: SPORT_VIEW_SEGMENTS.expectedPoints,
                element: <SportExpectedPointsPage />,
              },
              {
                path: SPORT_VIEW_SEGMENTS.players,
                element: <SportPlayersPage />,
              },
              {
                path: SPORT_VIEW_SEGMENTS.schedule,
                element: <SportSchedulePage />,
              },
              { path: SPORT_VIEW_SEGMENTS.starts, element: <SportStartsPage /> },
              {
                path: SPORT_VIEW_SEGMENTS.matchups,
                element: <SportMatchupsPage />,
              },
              {
                path: SPORT_VIEW_SEGMENTS.availability,
                element: <SportAvailabilityPage />,
              },
            ],
          },
          // Outside the tabs: one player, reached from the tables above.
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
