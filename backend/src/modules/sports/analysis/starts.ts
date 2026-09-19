import { clamp, median } from '../../../common/math/number.js';
import { START_CONFIDENCE, START_PROJECTION } from '../sports.constants.js';
import type {
  PlayerRef,
  ProjectedStart,
  ScheduledGame,
  StartConfidence,
} from '../sports.types.js';
import { addDays, daysBetween } from '../sports.utils.js';

/** Date → opponent for each team, so a projected start can land on a real game. */
export type TeamSchedules = Map<
  string,
  Map<string, { opponent: string; isHome: boolean }>
>;

export const teamSchedules = (games: ScheduledGame[]): TeamSchedules => {
  const byTeam: TeamSchedules = new Map();
  for (const game of games) {
    for (const [team, opponent, isHome] of [
      [game.home, game.away, true],
      [game.away, game.home, false],
    ] as const) {
      const dates = byTeam.get(team) ?? new Map();
      dates.set(game.date, { opponent, isHome });
      byTeam.set(team, dates);
    }
  }
  return byTeam;
};

/** Every announced starter in the window, with the starts they are announced for. */
export interface ConfirmedStarts {
  player: PlayerRef;
  starts: ProjectedStart[];
}

/**
 * The announced half of a starts report: upstream's probable pitchers, folded
 * per pitcher so a two-start week is one entry rather than two games.
 */
export const confirmedStarts = (
  games: ScheduledGame[],
): Map<string, ConfirmedStarts> => {
  const byPitcher = new Map<string, ConfirmedStarts>();

  for (const game of games) {
    for (const starter of [game.probables.away, game.probables.home]) {
      if (!starter) continue;
      const entry = byPitcher.get(starter.playerId) ?? {
        player: {
          id: starter.playerId,
          name: starter.name,
          team: starter.team,
          position: null,
        },
        starts: [],
      };
      entry.starts.push({
        date: game.date,
        opponent: starter.opponent,
        isHome: starter.isHome,
        confidence: START_CONFIDENCE.confirmed,
      });
      byPitcher.set(starter.playerId, entry);
    }
  }

  return byPitcher;
};

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
