import { clamp, median } from '../../../common/math/number.js';
import { START_CONFIDENCE, START_PROJECTION } from '../sports.constants.js';
import type { ProjectedStart, StartConfidence } from '../sports.types.js';
import { addDays, daysBetween } from '../sports.utils.js';

/**
 * Typical days between starts, from the most recent starts only — a pitcher
 * moved to or from the rotation shouldn't be judged on April.
 */
export const restPattern = (startDates: string[]) => {
  const recent = startDates.slice(-(START_PROJECTION.sampleStarts + 1));
  const gaps = recent
    .slice(1)
    .map((date, i) => daysBetween(recent[i], date))
    .filter((gap) => gap > 0);

  if (gaps.length === 0) return START_PROJECTION.restDays;
  return clamp(
    Math.round(median(gaps)),
    START_PROJECTION.minRestDays,
    START_PROJECTION.maxRestDays,
  );
};

interface ProjectStartsInput {
  /** Announced starts inside the window, oldest first. */
  confirmed: ProjectedStart[];
  /** Dates the pitcher's team plays, from the schedule. */
  teamGames: Map<string, { opponent: string; isHome: boolean }>;
  /** The pitcher's most recent start, announced or already played. */
  lastStart: string | null;
  /** Measured rest pattern; omitted callers get the league default. */
  restDays?: number;
  endDate: string;
}

/**
 * Fills in the starts upstream hasn't announced yet. Each projection lands on
 * a real scheduled game, sliding a day or two if the rotation turn falls on an
 * off day, and is returned alongside the confirmed starts so a caller can see
 * exactly how much of a two-start week is actually known.
 */
export const projectStarts = ({
  confirmed,
  teamGames,
  lastStart,
  restDays = START_PROJECTION.restDays,
  endDate,
}: ProjectStartsInput): ProjectedStart[] => {
  const taken = new Set(confirmed.map(({ date }) => date));
  const starts = [...confirmed];
  let cursor = confirmed.at(-1)?.date ?? lastStart;

  while (cursor) {
    const target = addDays(cursor, restDays);
    if (daysBetween(target, endDate) < 0) break;

    const landed = slideToGame(target, teamGames, taken, endDate);
    if (!landed) break;

    const game = teamGames.get(landed);
    if (!game) break;

    starts.push({
      date: landed,
      opponent: game.opponent,
      isHome: game.isHome,
      confidence: START_CONFIDENCE.projected as StartConfidence,
    });
    taken.add(landed);
    cursor = landed;
  }

  return starts.sort((a, b) => a.date.localeCompare(b.date));
};

const slideToGame = (
  target: string,
  teamGames: Map<string, unknown>,
  taken: Set<string>,
  endDate: string,
) => {
  for (let offset = 0; offset <= START_PROJECTION.slackDays; offset += 1) {
    const date = addDays(target, offset);
    if (daysBetween(date, endDate) < 0) return null;
    if (teamGames.has(date) && !taken.has(date)) return date;
  }
  return null;
};
