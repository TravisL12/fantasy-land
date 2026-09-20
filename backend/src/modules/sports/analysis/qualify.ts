import { BadRequestException } from '@nestjs/common';
import { SPORTS_MESSAGES } from '../sports.constants.js';
import type { StatDefinition, StatGroup } from '../sports.types.js';
import { resolveStatKey } from '../sports.utils.js';

/** Where the line falls for one rate stat, and what it was measured against. */
export interface QualifyingLine {
  /** The counting stat the threshold is in, e.g. plateAppearances. */
  stat: string;
  /** The least a player must have of it to be ranked. */
  minimum: number;
  /** The team-games figure the threshold was scaled by. */
  teamGames: number;
}

const round = (value: number) => Math.round(value * 10) / 10;

/**
 * Where to draw the line under a rate-stat leaderboard.
 *
 * Leagues set these thresholds against *team* games — 3.1 plate appearances for
 * every game the club played, not every game the batter did, or a part-timer
 * with a hot fortnight wins the batting title. A stat line carries no schedule,
 * so the busiest player in the pool stands in for it: whoever played most
 * played nearly all of them. That approximation holds just as well over a
 * window, where the pool is the same players measured over the same fixtures.
 *
 * Returns null for a stat that declares no qualifier, which is every counting
 * stat — nobody needs protecting from a home run leaderboard.
 */
export const qualifyingLine = (
  definition: StatDefinition | undefined,
  rows: readonly { gamesPlayed: number }[],
): QualifyingLine | null => {
  const qualifier = definition?.qualifier;
  if (!qualifier || rows.length === 0) return null;

  const teamGames = Math.max(...rows.map(({ gamesPlayed }) => gamesPlayed));
  if (teamGames <= 0) return null;

  return {
    stat: qualifier.stat,
    minimum: round(qualifier.perTeamGame * teamGames),
    teamGames,
  };
};

export const meetsQualifyingLine = (
  row: { stats: Record<string, number> },
  { stat, minimum }: QualifyingLine,
): boolean => (row.stats[stat] ?? 0) >= minimum;

/**
 * Which line, if any, a ranking should be drawn under.
 *
 * An explicit `minStat` always wins, including `minStatValue: 0`, which is how
 * a caller asks to see everybody. Otherwise the line is the sorted stat's own
 * qualifier, applied only when that stat is what the ranking is by: filtering a
 * home run leaderboard by plate appearances would drop players the question
 * asked about.
 */
export const resolveQualifyingLine = (
  group: StatGroup,
  sort: string,
  query: { minStat?: string; minStatValue?: number },
  rows: readonly { gamesPlayed: number }[],
): QualifyingLine | null => {
  if (query.minStat) {
    const definition = resolveStatKey(group, query.minStat);
    if (!definition) {
      throw new BadRequestException(
        SPORTS_MESSAGES.unknownQualifierStat(
          query.minStat,
          group.stats.map(({ key }) => key),
        ),
      );
    }
    return {
      stat: definition,
      minimum: query.minStatValue ?? 0,
      teamGames: Math.max(0, ...rows.map(({ gamesPlayed }) => gamesPlayed)),
    };
  }

  return qualifyingLine(
    group.stats.find(({ key }) => key === sort),
    rows,
  );
};
