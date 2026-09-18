import { SPORT_VIEW_SEGMENTS } from '@/router/routes.constants';
import type { SportTab } from './SportTabs.types';

/**
 * Every local dataset a sport can offer. A tab whose capability the sport's
 * provider does not implement is not rendered at all — an empty page that
 * explains it is empty is worse than a tab that was never there.
 */
export const SPORT_TABS: SportTab[] = [
  { label: 'Leaderboard' },
  {
    segment: SPORT_VIEW_SEGMENTS.expectedPoints,
    label: 'Expected points',
    requires: 'expectedPoints',
  },
  {
    segment: SPORT_VIEW_SEGMENTS.players,
    label: 'Players',
    requires: 'playerDirectory',
  },
  {
    segment: SPORT_VIEW_SEGMENTS.schedule,
    label: 'Schedule',
    requires: 'leagueData',
  },
  {
    segment: SPORT_VIEW_SEGMENTS.starts,
    label: 'Starts',
    requires: 'leagueData',
  },
  {
    segment: SPORT_VIEW_SEGMENTS.matchups,
    label: 'Matchups',
    requires: 'leagueData',
  },
  {
    segment: SPORT_VIEW_SEGMENTS.availability,
    label: 'Availability',
    requires: 'leagueData',
  },
];
