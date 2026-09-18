import { generatePath } from 'react-router';

export const ROUTES = {
  home: '/',
  login: '/login',
  register: '/register',
  chat: '/chat',
  dashboards: '/dashboards',
  dashboardCreate: '/dashboards/create',
  dashboardExamples: '/dashboards/examples',
  dashboard: '/dashboards/:dashboardId',
  dashboardEdit: '/dashboards/:dashboardId/edit',
  sports: '/sports',
  sportStats: '/sports/:sport',
  sportExpectedPoints: '/sports/:sport/expected-points',
  sportPlayers: '/sports/:sport/players',
  sportSchedule: '/sports/:sport/schedule',
  sportStarts: '/sports/:sport/starts',
  sportMatchups: '/sports/:sport/matchups',
  sportAvailability: '/sports/:sport/availability',
  playerStats: '/sports/:sport/players/:playerId',
} as const;

/** The child routes of a sport, as segments under /sports/:sport. */
export const SPORT_VIEW_SEGMENTS = {
  expectedPoints: 'expected-points',
  players: 'players',
  schedule: 'schedule',
  starts: 'starts',
  matchups: 'matchups',
  availability: 'availability',
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

/** A sport's view route, e.g. buildSportViewPath('nfl', 'matchups'). */
export const buildSportViewPath = (sport: string, view?: string) =>
  view
    ? `${generatePath(ROUTES.sportStats, { sport })}/${view}`
    : generatePath(ROUTES.sportStats, { sport });

export const buildPlayerStatsPath = (
  sport: string,
  playerId: string,
  search?: Record<string, string | undefined>,
) => withSearch(generatePath(ROUTES.playerStats, { sport, playerId }), search);

export const buildDashboardPath = (dashboardId: string) =>
  generatePath(ROUTES.dashboard, { dashboardId });

export const buildDashboardEditPath = (dashboardId: string) =>
  generatePath(ROUTES.dashboardEdit, { dashboardId });
