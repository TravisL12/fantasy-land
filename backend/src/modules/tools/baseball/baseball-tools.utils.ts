import type { MatchupRating } from '../../sports/sports.types.js';

/**
 * A matchup as a chat turn needs it: the score and the grade it is compared
 * on. The per-metric breakdown is dropped — it is three labelled objects per
 * start, repeated for every pitcher in the window, and get_matchup_ratings
 * exists to answer "why" when the question actually asks.
 */
export const compactMatchup = (
  matchup: MatchupRating | null | undefined,
  full = false,
) => {
  if (!matchup || full) return matchup ?? null;
  const { score, grade } = matchup;
  return { score, grade };
};

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
