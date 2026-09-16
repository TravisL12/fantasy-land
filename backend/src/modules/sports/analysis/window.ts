import type { GameLogEntry, GameWindow } from '../sports.types.js';

type Windowed = Pick<GameLogEntry, 'date' | 'week'>;

const inDateRange = (
  date: string | null,
  { startDate, endDate }: GameWindow,
) => {
  if (!startDate && !endDate) return true;
  // A dateless entry cannot be placed in a date window, so it drops out.
  if (!date) return false;
  return (!startDate || date >= startDate) && (!endDate || date <= endDate);
};

const inWeeks = (week: number | null, weeks?: number[]) =>
  !weeks?.length || (week !== null && weeks.includes(week));

/** True when the window would filter by date but nothing in the log has one. */
export const datesUnusable = (entries: Windowed[], window: GameWindow) =>
  Boolean(window.startDate || window.endDate) &&
  entries.length > 0 &&
  entries.every(({ date }) => date === null);

/**
 * Narrows a game log to a window. Filters apply first and `lastN` last, so
 * "the last 5 games in September" is exactly that rather than the September
 * slice of the last 5 games. Entries stay oldest-first, as providers return them.
 */
export const sliceGames = <T extends Windowed>(
  entries: T[],
  window: GameWindow,
): T[] => {
  const filtered = datesUnusable(entries, window)
    ? entries.filter(({ week }) => inWeeks(week, window.weeks))
    : entries.filter(
        (entry) =>
          inDateRange(entry.date, window) && inWeeks(entry.week, window.weeks),
      );

  return window.lastN ? filtered.slice(-window.lastN) : filtered;
};
