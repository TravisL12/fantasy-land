import { generatePath } from 'react-router';

export const ROUTES = {
  home: '/',
  login: '/login',
  register: '/register',
  chat: '/chat',
  dashboards: '/dashboards',
  dashboardCreate: '/dashboards/create',
  dashboard: '/dashboards/:dashboardId',
  sports: '/sports',
  sportStats: '/sports/:sport',
  playerStats: '/sports/:sport/players/:playerId',
} as const;

const withSearch = (
  path: string,
  search?: Record<string, string | undefined>,
) => {
  const params = new URLSearchParams(
    Object.entries(search ?? {}).filter(
      (entry): entry is [string, string] => !!entry[1],
    ),
  ).toString();
  return params ? `${path}?${params}` : path;
};

export const buildSportStatsPath = (sport: string) =>
  generatePath(ROUTES.sportStats, { sport });

export const buildPlayerStatsPath = (
  sport: string,
  playerId: string,
  search?: Record<string, string | undefined>,
) => withSearch(generatePath(ROUTES.playerStats, { sport, playerId }), search);

export const buildDashboardPath = (dashboardId: string) =>
  generatePath(ROUTES.dashboard, { dashboardId });
