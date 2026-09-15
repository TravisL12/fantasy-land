import type {
  GameLogEntry,
  PlayerRef,
  StatGroup,
  StatLine,
  StatValues,
} from '../../sports.types.js';
import { toNumber } from '../provider.utils.js';
import {
  MLB_DERIVED_STATS,
  MLB_GROUP_KEYS,
  MLB_PITCHER_POSITION_TYPE,
  MLB_PITCHER_ROLES,
  MLB_STARTER_SHARE,
} from './mlb.constants.js';
import type {
  MlbGameLogSplit,
  MlbPerson,
  MlbRawStats,
  MlbRef,
  MlbSeasonSplit,
} from './mlb.types.js';

export type TeamAbbreviations = Record<number, string>;

/** "184.2" means 184 innings and 2 outs, i.e. 184.667 innings. */
export const parseInnings = (value: unknown): number | undefined => {
  const parsed = toNumber(value);
  if (parsed === undefined) return undefined;
  const whole = Math.trunc(parsed);
  const outs = Math.round((parsed - whole) * 10);
  return whole + outs / 3;
};

export const mapStats = (raw: MlbRawStats, group: StatGroup): StatValues => {
  const stats: StatValues = {};
  for (const { key } of group.stats) {
    const value =
      key === 'inningsPitched' ? parseInnings(raw[key]) : toNumber(raw[key]);
    if (value !== undefined) stats[key] = value;
  }
  if (group.key === MLB_GROUP_KEYS.hitting) {
    const hits = toNumber(raw.hits) ?? 0;
    const extraBaseHits = ['doubles', 'triples', 'homeRuns'].reduce(
      (sum, key) => sum + (toNumber(raw[key]) ?? 0),
      0,
    );
    stats[MLB_DERIVED_STATS.singles] = hits - extraBaseHits;
  }
  return stats;
};

const teamAbbr = (team: MlbRef | undefined, teams: TeamAbbreviations) =>
  team ? (teams[team.id] ?? team.name ?? null) : null;

/** The API only says "P"; split pitchers into starters and relievers by usage. */
export const pitchingRole = (raw: MlbRawStats | StatValues) => {
  const games = toNumber(raw.gamesPlayed) ?? 0;
  const starts = toNumber(raw.gamesStarted) ?? 0;
  return games > 0 && starts / games >= MLB_STARTER_SHARE
    ? MLB_PITCHER_ROLES.starter
    : MLB_PITCHER_ROLES.reliever;
};

export const mapSeasonSplits = (
  splits: MlbSeasonSplit[],
  group: StatGroup,
  teams: TeamAbbreviations,
): StatLine[] =>
  splits.map((split) => ({
    player: {
      id: String(split.player.id),
      name: split.player.fullName,
      team: teamAbbr(split.team, teams),
      position:
        group.key === MLB_GROUP_KEYS.pitching
          ? pitchingRole(split.stat)
          : (split.position?.abbreviation ?? null),
    },
    gamesPlayed: toNumber(split.stat.gamesPlayed) ?? 0,
    stats: mapStats(split.stat, group),
  }));

export const groupForPerson = (person: MlbPerson) =>
  person.primaryPosition?.type === MLB_PITCHER_POSITION_TYPE
    ? MLB_GROUP_KEYS.pitching
    : MLB_GROUP_KEYS.hitting;

export const toPlayerRef = (
  person: MlbPerson,
  teams: TeamAbbreviations,
): PlayerRef => ({
  id: String(person.id),
  name: person.fullName,
  team: teamAbbr(person.currentTeam, teams),
  position: person.primaryPosition?.abbreviation ?? null,
});

export const mapGameLog = (
  splits: MlbGameLogSplit[],
  group: StatGroup,
  teams: TeamAbbreviations,
): GameLogEntry[] =>
  splits.map((split) => ({
    date: split.date,
    week: null,
    opponent: teamAbbr(split.opponent, teams),
    isHome: split.isHome,
    stats: mapStats(split.stat, group),
  }));
