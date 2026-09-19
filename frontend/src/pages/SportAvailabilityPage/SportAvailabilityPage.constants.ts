import type { Availability } from '@/api/sports';
import type { StatusTone } from '@/styles';

export const AVAILABILITY_PARAMS = {
  season: 'season',
  availability: 'availability',
  team: 'team',
  search: 'q',
} as const;

export const AVAILABILITY_LABELS: Record<Availability, string> = {
  active: 'Active',
  injured: 'Injured',
  minors: 'Minors',
  inactive: 'Inactive',
};

export const AVAILABILITY_TONES: Record<Availability, StatusTone> = {
  active: 'good',
  injured: 'critical',
  minors: 'warning',
  inactive: 'neutral',
};

export const SEARCH_DEBOUNCE_MS = 300;

export const AVAILABILITY_COPY = {
  caption: 'Roster availability',
  empty: 'No players match those filters.',
  explainer:
    'Who is available, injured or off the active roster, normalized from the league’s own wording. Check this before starting anyone.',
  searchLabel: 'Search',
  searchPlaceholder: 'Name…',
  statusLabel: 'Availability',
  all: 'All',
  columns: {
    player: 'Player',
    team: 'Team',
    position: 'Pos',
    status: 'Reported as',
    availability: 'Availability',
  },
} as const;
