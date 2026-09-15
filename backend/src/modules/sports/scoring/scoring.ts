import type {
  PointsSummary,
  ScoringRules,
  StatDefinition,
  StatValues,
} from '../sports.types.js';

const round = (value: number, places = 2) => {
  const factor = 10 ** places;
  return Math.round(value * factor) / factor;
};

export const calculateFantasyPoints = (
  stats: StatValues,
  rules: ScoringRules,
) =>
  round(
    Object.entries(rules).reduce(
      (total, [stat, points]) => total + (stats[stat] ?? 0) * points,
      0,
    ),
  );

export const perGame = (total: number, games: number) =>
  games > 0 ? round(total / games) : 0;

export const summarizePoints = (points: number[]): PointsSummary => {
  const games = points.length;
  if (games === 0) {
    return {
      games,
      total: 0,
      average: 0,
      median: 0,
      stdDev: 0,
      floor: 0,
      ceiling: 0,
    };
  }
  const total = points.reduce((sum, p) => sum + p, 0);
  const average = total / games;
  const variance =
    points.reduce((sum, p) => sum + (p - average) ** 2, 0) / games;
  const sorted = [...points].sort((a, b) => a - b);
  const mid = Math.floor(games / 2);
  const median = games % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;

  return {
    games,
    total: round(total),
    average: round(average),
    median: round(median),
    stdDev: round(Math.sqrt(variance)),
    floor: sorted[0],
    ceiling: sorted[games - 1],
  };
};

/** Adds up summable stats across games; rate stats are left out. */
export const sumStats = (
  entries: StatValues[],
  definitions: StatDefinition[],
) =>
  Object.fromEntries(
    definitions
      .filter(({ summable }) => summable)
      .map(({ key }) => [
        key,
        round(entries.reduce((sum, stats) => sum + (stats[key] ?? 0), 0)),
      ]),
  ) as StatValues;
