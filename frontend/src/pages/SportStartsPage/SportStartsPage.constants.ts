export const STARTS_PARAMS = {
  season: 'season',
  startDate: 'startDate',
  endDate: 'endDate',
} as const;

export const CONFIDENCE_TONES: Record<string, string> = {
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
