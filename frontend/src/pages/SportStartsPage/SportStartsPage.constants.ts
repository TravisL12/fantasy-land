import type { StartConfidence } from '@/api/sports';
import type { StatusTone } from '@/styles';

export const STARTS_PARAMS = {
  season: 'season',
  startDate: 'startDate',
  endDate: 'endDate',
} as const;

/** Keyed by the confidence union, so every start is colored by construction. */
export const CONFIDENCE_TONES: Record<StartConfidence, StatusTone> = {
  confirmed: 'good',
  projected: 'warning',
};

export const STARTS_COPY = {
  caption: 'Projected starts in this window',
  empty: 'No starts in that window.',
  explainer:
    'Who starts between these dates. Announced starters are confirmed; anything past the league’s ~4-day horizon is projected from the pitcher’s own rest pattern and labelled as such.',
  fromLabel: 'From',
  toLabel: 'To',
  columns: {
    player: 'Pitcher',
    team: 'Team',
    starts: 'Starts',
    confirmed: 'Confirmed',
    matchupScore: 'Avg matchup',
    detail: 'When',
  },
} as const;
