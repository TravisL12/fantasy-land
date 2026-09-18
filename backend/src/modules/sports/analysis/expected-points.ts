import { round } from '../../../common/math/number.js';
import {
  EXPECTED_POINTS_DEFAULTS,
  EXPECTED_POINTS_POOLED,
} from '../sports.constants.js';
import type {
  ExpectedPointsLine,
  ExpectedPointsModel,
  ScoredStatLine,
  StatValues,
} from '../sports.types.js';

/**
 * Expected fantasy points — what a player's *chances* were worth, before what
 * they did with them.
 *
 * The engine is sport-agnostic in the same way `scoring/` is: it is handed the
 * opportunity stat keys (from the provider) and a population of scored stat
 * lines, and it measures how many points each opportunity was worth **in that
 * league, that season, under that scoring preset** by least squares. Nothing
 * is hardcoded, so switching from standard to PPR re-prices a target without a
 * line of code, and a season where the league throws deeper re-prices an air
 * yard.
 *
 * What it is not: true play-by-play xFP. From per-game aggregates we can see
 * how many targets, carries and red-zone chances a player got, but not the
 * yardline and down each one came on, so touchdown expectation is the weakest
 * part of the estimate — `rec_rz_tgt`/`rush_rz_att` recover much of it, not
 * all. Call the number "expected points from opportunity" and it is honest;
 * call it the industry's xFP and it is not.
 */

/** One player-season, reduced to per-game rates: the unit the fit sees. */
interface Observation {
  features: number[];
  target: number;
  /** Games played, so a 17-game season counts for more than a 3-game one. */
  weight: number;
}

const perGameFeatures = (line: ScoredStatLine, keys: string[]) =>
  keys.map((key) => (line.stats[key] ?? 0) / line.gamesPlayed);

/**
 * Weighted ridge regression through the origin, solved from the normal
 * equations. There is no intercept on purpose: a player who was never given
 * the ball is expected to score nothing, and an intercept would hand every
 * bench player a few free points.
 */
const solve = (observations: Observation[], size: number, ridge: number) => {
  // XᵀX + ridge·I, and Xᵀy, accumulated in one pass.
  const xtx = Array.from({ length: size }, (_, i) =>
    Array.from({ length: size }, (_, j) => (i === j ? ridge : 0)),
  );
  const xty = Array.from({ length: size }, () => 0);

  for (const { features, target, weight } of observations) {
    for (let i = 0; i < size; i += 1) {
      xty[i] += weight * features[i] * target;
      for (let j = i; j < size; j += 1) {
        xtx[i][j] += weight * features[i] * features[j];
      }
    }
  }
  for (let i = 0; i < size; i += 1) {
    for (let j = 0; j < i; j += 1) xtx[i][j] = xtx[j][i];
  }

  return gaussian(xtx, xty);
};

/** Gaussian elimination with partial pivoting; a singular system has no fit. */
const gaussian = (matrix: number[][], vector: number[]): number[] | null => {
  const size = vector.length;
  const rows = matrix.map((row, i) => [...row, vector[i]]);

  for (let col = 0; col < size; col += 1) {
    let pivot = col;
    for (let row = col + 1; row < size; row += 1) {
      if (Math.abs(rows[row][col]) > Math.abs(rows[pivot][col])) pivot = row;
    }
    if (Math.abs(rows[pivot][col]) < Number.EPSILON) return null;
    [rows[col], rows[pivot]] = [rows[pivot], rows[col]];

    for (let row = 0; row < size; row += 1) {
      if (row === col) continue;
      const factor = rows[row][col] / rows[col][col];
      for (let k = col; k <= size; k += 1) rows[row][k] -= factor * rows[col][k];
    }
  }

  return rows.map((row, i) => row[size] / row[i]);
};

/**
 * Least squares will happily price an opportunity at *minus* two points when
 * two correlated stats fight each other, which is nonsense as a rate and
 * produces negative expectations for real players. A feature that comes back
 * negative is dropped and the rest refit, which is the cheap standard
 * approximation to a non-negative fit.
 */
const fitNonNegative = (
  observations: Observation[],
  size: number,
  ridge: number,
): number[] | null => {
  let active = Array.from({ length: size }, (_, i) => i);

  while (active.length) {
    const solved = solve(
      observations.map(({ features, target, weight }) => ({
        features: active.map((i) => features[i]),
        target,
        weight,
      })),
      active.length,
      ridge,
    );
    if (!solved) return null;

    const kept = active.filter((_, i) => solved[i] > 0);
    if (kept.length === active.length) {
      const weights = Array.from({ length: size }, () => 0);
      active.forEach((feature, i) => {
        weights[feature] = solved[i];
      });
      return weights;
    }
    active = kept;
  }

  return Array.from({ length: size }, () => 0);
};

/** Weighted R² against the population mean, so 0 means "no better than average". */
const rSquared = (observations: Observation[], weights: number[]) => {
  const totalWeight = observations.reduce((sum, o) => sum + o.weight, 0);
  if (!totalWeight) return 0;

  const mean =
    observations.reduce((sum, o) => sum + o.weight * o.target, 0) / totalWeight;
  let residual = 0;
  let variance = 0;
  for (const { features, target, weight } of observations) {
    const predicted = features.reduce((sum, f, i) => sum + f * weights[i], 0);
    residual += weight * (target - predicted) ** 2;
    variance += weight * (target - mean) ** 2;
  }

  return variance ? Math.max(0, 1 - residual / variance) : 0;
};

/**
 * Which opportunities this position actually gets. Quarterbacks are thrown a
 * pass a few times a season on a trick play, and a fit left to explain their
 * scoring with those will price a quarterback target at three points — then
 * hand three points to the one who catches one. A feature barely anyone at the
 * position sees is noise, so it is left out of their model rather than priced.
 */
const coveredFeatures = (
  lines: ScoredStatLine[],
  keys: string[],
  minCoverage: number,
) =>
  keys.filter(
    (key) =>
      lines.filter((line) => (line.stats[key] ?? 0) > 0).length >=
      lines.length * minCoverage,
  );

const fitModel = (
  position: string,
  lines: ScoredStatLine[],
  keys: string[],
  { ridge, minCoverage }: { ridge: number; minCoverage: number },
): ExpectedPointsModel | null => {
  // An empty sample would "fit" every weight at zero, which is not a model
  // saying players score nothing — it is no model at all.
  if (!lines.length) return null;

  const covered = coveredFeatures(lines, keys, minCoverage);
  const observations = lines.map((line) => ({
    features: perGameFeatures(line, covered),
    target: line.fantasyPointsPerGame,
    weight: line.gamesPlayed,
  }));

  const fitted = fitNonNegative(observations, covered.length, ridge);
  if (!fitted) return null;

  const weights = new Map(covered.map((key, i) => [key, fitted[i]]));
  return {
    position,
    observations: observations.length,
    rSquared: round(rSquared(observations, fitted), 3),
    weights: Object.fromEntries(
      keys.map((key) => [
        key,
        round(weights.get(key) ?? 0, EXPECTED_POINTS_DEFAULTS.weightPlaces),
      ]),
    ),
  };
};

const applyModel = (line: ScoredStatLine, model: ExpectedPointsModel) =>
  Object.entries(model.weights).reduce(
    (total, [key, weight]) => total + (line.stats[key] ?? 0) * weight,
    0,
  );

/**
 * Fits one model per position from the league population, then measures every
 * player against the model for their position. Positions with too small a
 * sample share the pooled model rather than getting a fit nobody should trust.
 *
 * `lines` is the whole league, not the rows the caller wants back: filtering
 * to one team before fitting would price a target off that team alone.
 */
export const expectedPoints = (
  lines: ScoredStatLine[],
  keys: string[],
  {
    minGames = EXPECTED_POINTS_DEFAULTS.minGames,
    minObservations = EXPECTED_POINTS_DEFAULTS.minObservations,
    ridge = EXPECTED_POINTS_DEFAULTS.ridge,
    minCoverage = EXPECTED_POINTS_DEFAULTS.minCoverage,
  }: {
    minGames?: number;
    minObservations?: number;
    ridge?: number;
    minCoverage?: number;
  } = {},
): { models: ExpectedPointsModel[]; lines: ExpectedPointsLine[] } => {
  const sample = lines.filter(
    (line) =>
      line.gamesPlayed >= minGames &&
      keys.some((key) => (line.stats[key] ?? 0) > 0),
  );

  const byPosition = new Map<string, ScoredStatLine[]>();
  for (const line of sample) {
    const position = line.player.position ?? EXPECTED_POINTS_POOLED;
    byPosition.set(position, [...(byPosition.get(position) ?? []), line]);
  }

  const fit = { ridge, minCoverage };
  const pooled = fitModel(EXPECTED_POINTS_POOLED, sample, keys, fit);
  const models = new Map<string, ExpectedPointsModel>();
  for (const [position, positionLines] of byPosition) {
    const model =
      positionLines.length >= minObservations
        ? fitModel(position, positionLines, keys, fit)
        : null;
    if (model) models.set(position, model);
  }
  if (pooled) models.set(EXPECTED_POINTS_POOLED, pooled);

  const measured = lines.flatMap((line): ExpectedPointsLine[] => {
    const model =
      models.get(line.player.position ?? EXPECTED_POINTS_POOLED) ?? pooled;
    if (!model) return [];

    const places = EXPECTED_POINTS_DEFAULTS.places;
    const expected = round(applyModel(line, model), places);
    const delta = round(line.fantasyPoints - expected, places);

    return [
      {
        player: line.player,
        gamesPlayed: line.gamesPlayed,
        fantasyPoints: round(line.fantasyPoints, places),
        pointsPerGame: round(line.fantasyPointsPerGame, places),
        expectedPoints: expected,
        expectedPointsPerGame: round(
          line.gamesPlayed ? expected / line.gamesPlayed : 0,
          places,
        ),
        delta,
        deltaPerGame: round(
          line.gamesPlayed ? delta / line.gamesPlayed : 0,
          places,
        ),
        efficiency: expected > 0 ? round(line.fantasyPoints / expected) : null,
        model: model.position,
        opportunities: Object.fromEntries(
          keys.flatMap((key): [string, number][] =>
            line.stats[key] === undefined ? [] : [[key, line.stats[key]]],
          ),
        ) satisfies StatValues,
      },
    ];
  });

  return { models: [...models.values()], lines: measured };
};
