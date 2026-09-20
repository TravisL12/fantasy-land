import { VENUES } from '../sports.constants.js';
import type { GameLogEntry, GameWindow } from '../sports.types.js';

/**
 * Venue and opponent are optional so a caller that only slices by date — the
 * schedule, the starts report — need not carry fields it has no use for.
 */
type Windowed = Pick<GameLogEntry, 'date' | 'week'> &
  Partial<Pick<GameLogEntry, 'opponent' | 'isHome'>>;

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

const atVenue = (isHome: boolean | null, venue?: GameWindow['venue']) => {
  if (!venue) return true;
  // A log that does not say cannot be split; venueUnusable reports that.
  if (isHome === null) return false;
  return venue === VENUES.home ? isHome : !isHome;
};

const against = (opponent: string | null, wanted?: string) =>
  !wanted || opponent?.toUpperCase() === wanted.toUpperCase();

/** True when the window would filter by date but nothing in the log has one. */
export const datesUnusable = (entries: Windowed[], window: GameWindow) =>
  Boolean(window.startDate || window.endDate) &&
  entries.length > 0 &&
  entries.every(({ date }) => date === null);

/** The same, for a venue split: the log carries no home/away flag at all. */
export const venueUnusable = (entries: Windowed[], window: GameWindow) =>
  Boolean(window.venue) &&
  entries.length > 0 &&
  entries.every(({ isHome }) => isHome === null || isHome === undefined);

/**
 * Narrows a game log to a window. Filters apply first and `lastN` last, so
 * "the last 5 games in September" is exactly that rather than the September
 * slice of the last 5 games. Entries stay oldest-first, as providers return them.
 */
export const sliceGames = <T extends Windowed>(
  entries: T[],
  window: GameWindow,
): T[] => {
  const ignoreDates = datesUnusable(entries, window);
  const ignoreVenue = venueUnusable(entries, window);

  const filtered = entries.filter(
    (entry) =>
      (ignoreDates || inDateRange(entry.date, window)) &&
      inWeeks(entry.week, window.weeks) &&
      (ignoreVenue || atVenue(entry.isHome ?? null, window.venue)) &&
      against(entry.opponent ?? null, window.opponent),
  );

  return window.lastN ? filtered.slice(-window.lastN) : filtered;
};
