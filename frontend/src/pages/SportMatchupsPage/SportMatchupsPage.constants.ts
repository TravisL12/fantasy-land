export const MATCHUP_PARAMS = { season: 'season', side: 'side' } as const;

export const MATCHUP_SIDES = { hitting: 'hitting', pitching: 'pitching' } as const;

export const SIDE_LABELS: Record<string, string> = {
  hitting: 'For hitters',
  pitching: 'For pitchers',
};

/** Grades map to the status palette, which is reserved for exactly this. */
export const GRADE_TONES: Record<string, keyof typeof TONE_KEYS> = {
  great: 'good',
  good: 'good',
  neutral: 'neutral',
  tough: 'serious',
  brutal: 'critical',
};

const TONE_KEYS = {
  good: 'good',
  warning: 'warning',
  serious: 'serious',
  critical: 'critical',
  neutral: 'neutral',
} as const;

export const MATCHUP_COPY = {
  caption: 'Every team rated as an opponent',
  empty: 'No matchup ratings for that season.',
  explainer:
    'How good a matchup each team is to face, as a league-relative percentile of the metrics below. 100 is the easiest team in the league to face.',
  sideLabel: 'Rated',
  columns: {
    team: 'Team',
    score: 'Score',
    grade: 'Grade',
    metrics: 'Why',
  },
} as const;
