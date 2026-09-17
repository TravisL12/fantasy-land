/**
 * The numeric helpers the scoring, analysis and tool layers all need. They
 * lived as private copies in five files, which is how two of them ended up
 * rounding to different numbers of places for the same kind of value.
 */

/** Rounds to `places` decimals, avoiding the usual float tail. */
export const round = (value: number, places = 2) => {
  const factor = 10 ** places;
  return Math.round(value * factor) / factor;
};

export const clamp = (value: number, min: number, max: number) =>
  Math.min(Math.max(value, min), max);

/** Mean of a non-empty list; an empty one has no mean, so it is 0. */
export const mean = (values: number[]) =>
  values.length
    ? values.reduce((sum, value) => sum + value, 0) / values.length
    : 0;

/** Middle value, averaging the two middles of an even-length list. */
export const median = (values: number[]) => {
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2
    ? sorted[middle]
    : (sorted[middle - 1] + sorted[middle]) / 2;
};
