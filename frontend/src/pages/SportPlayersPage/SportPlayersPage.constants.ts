import type { Availability } from '@/api/sports';

export const PLAYER_PARAMS = {
  search: 'q',
  position: 'position',
  availability: 'availability',
  page: 'page',
} as const;

export const PLAYERS_PAGE_SIZE = 50;
export const SEARCH_DEBOUNCE_MS = 300;

/** The NFL's own wording for the same normalized statuses the API returns. */
export const AVAILABILITY_LABELS: Record<Availability, string> = {
  active: 'Active',
  injured: 'Injured',
  minors: 'Practice squad',
  inactive: 'Inactive',
};

export const PLAYERS_COPY = {
  caption: 'Every player in the league directory',
  empty: 'No players match those filters.',
  explainer:
    'The league’s whole player list, pulled once a day and held locally — including players with no stats this season. Click a player for their game log.',
  searchLabel: 'Search',
  searchPlaceholder: 'Name…',
  positionLabel: 'Position',
  availabilityLabel: 'Availability',
  all: 'All',
  columns: {
    player: 'Player',
    team: 'Team',
    position: 'Pos',
    status: 'Status',
    availability: 'Availability',
  },
} as const;
