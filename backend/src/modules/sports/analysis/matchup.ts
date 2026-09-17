import { mean, round } from '../../../common/math/number.js';
import {
  MATCHUP_GRADE_CUTOFFS,
  MATCHUP_GRADES,
  MATCHUP_SCALE,
} from '../sports.constants.js';
import type {
  MatchupGrade,
  MatchupMetric,
  MatchupRating,
  TeamStrength,
} from '../sports.types.js';

const gradeFor = (score: number): MatchupGrade =>
  MATCHUP_GRADE_CUTOFFS.find(({ min }) => score >= min)?.grade ??
  MATCHUP_GRADES.brutal;

/**
 * Percentile of `value` among `all`, as 0-100 where 100 means the easiest
 * matchup. `betterWhenHigh` describes the opposing team, so it is inverted:
 * a strong opponent offense is a hard matchup for the pitcher facing it.
 */
const percentile = (value: number, all: number[], betterWhenHigh: boolean) => {
  if (all.length < 2) return MATCHUP_SCALE.neutral;
  const worseForOpponent = all.filter((other) =>
    betterWhenHigh ? other < value : other > value,
  ).length;
  const tied = all.filter((other) => other === value).length;
  const easierRank = all.length - worseForOpponent - tied / 2;
  return round((easierRank / all.length) * MATCHUP_SCALE.max, MATCHUP_SCALE.scorePlaces);
};

/**
 * Rates every team as an *opponent*, so the result is how good a matchup each
 * team is for the player facing them. Metrics are league-relative percentiles,
 * which keeps the scale stable across seasons and run environments.
 */
export const rateMatchups = (
  teams: TeamStrength[],
  metrics: MatchupMetric[],
): Map<string, MatchupRating> => {
  const values = new Map(
    metrics.map((metric) => [
      metric.key,
      teams
        .map((team) => metric.value(team))
        .filter((value): value is number => value !== undefined),
    ]),
  );

  return new Map(
    teams.map((team) => {
      const rated = metrics.flatMap((metric) => {
        const value = metric.value(team);
        const all = values.get(metric.key) ?? [];
        if (value === undefined || all.length === 0) return [];
        return [
          {
            key: metric.key,
            label: metric.label,
            value: round(value, MATCHUP_SCALE.valuePlaces),
            rank: percentile(value, all, metric.betterWhenHigh),
          },
        ];
      });

      const score = rated.length
        ? round(mean(rated.map(({ rank }) => rank)), MATCHUP_SCALE.scorePlaces)
        : MATCHUP_SCALE.neutral;

      return [team.team, { score, grade: gradeFor(score), metrics: rated }];
    }),
  );
};
