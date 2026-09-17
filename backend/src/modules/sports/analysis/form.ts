import { round } from '../../../common/math/number.js';
import { sumStats, summarizePoints } from '../scoring/scoring.js';
import { FORM_DEFAULTS, FORM_TRENDS } from '../sports.constants.js';
import type {
  FormReport,
  FormTrend,
  ScoredGameLogEntry,
  StatDefinition,
  StatValues,
} from '../sports.types.js';

/**
 * A trend needs to clear a share of the player's own season rate, so a 2-point
 * swing reads as noise for a star and as a real move for a streamer.
 */
const trendFor = (recent: number, season: number): FormTrend => {
  const threshold = Math.abs(season) * FORM_DEFAULTS.trendThreshold;
  if (recent - season > threshold) return FORM_TRENDS.hot;
  if (season - recent > threshold) return FORM_TRENDS.cold;
  return FORM_TRENDS.steady;
};

/**
 * Compares a player's last `window` games with their season as a whole.
 * Entries are expected oldest-first, matching the game logs providers return.
 */
export const analyzeForm = (
  entries: ScoredGameLogEntry[],
  window: number,
  statDefinitions: StatDefinition[],
): FormReport => {
  const recentEntries = entries.slice(-window);
  const season = summarizePoints(entries.map((e) => e.fantasyPoints));
  const recent = summarizePoints(recentEntries.map((e) => e.fantasyPoints));

  return {
    window,
    recent,
    season,
    delta: round(recent.average - season.average),
    trend: trendFor(recent.average, season.average),
    recentTotals: sumStats(
      recentEntries.map(({ stats }): StatValues => stats),
      statDefinitions,
    ),
  };
};
