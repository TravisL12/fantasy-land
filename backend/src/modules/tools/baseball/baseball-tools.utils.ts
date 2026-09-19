import type { MatchupRating } from '../../sports/sports.types.js';

/**
 * The breakdown itself, minus the label: "ops" and "OPS" are the same word to
 * a model, and the key is what every other tool speaks.
 */
export const compactMetrics = (matchup: MatchupRating, full = false) =>
  full
    ? matchup
    : {
        ...matchup,
        metrics: matchup.metrics.map(({ key, value, rank }) => ({
          key,
          value,
          rank,
        })),
      };
