import { AVAILABILITY } from '../../sports.constants.js';
import type {
  Availability,
  GameLogEntry,
  PlayerRef,
  PlayerStatus,
  ProbableStarter,
  ScheduledGame,
  StatGroup,
  StatLine,
  StatValues,
  TeamStrength,
} from '../../sports.types.js';
import { pickStats, toNumber } from '../provider.utils.js';
import {
  MLB_DERIVED_STATS,
  MLB_GROUP_KEYS,
  MLB_PITCHER_POSITION_TYPE,
  MLB_PITCHER_ROLES,
  MLB_STARTER_SHARE,
  MLB_STATUS_CODES,
  MLB_STATUS_KEYWORDS,
  MLB_TEAM_STAT_KEYS,
} from './mlb.constants.js';
import type {
  MlbGameLogSplit,
  MlbPerson,
  MlbRawStats,
  MlbRef,
  MlbRosterEntry,
  MlbScheduleResponse,
  MlbSeasonSplit,
  MlbTeamStatSplit,
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

export const mapSchedule = (
  dates: MlbScheduleResponse['dates'],
  teams: TeamAbbreviations,
): ScheduledGame[] =>
  dates.flatMap(({ games }) =>
    games.flatMap((game) => {
      const home = teamAbbr(game.teams.home.team, teams);
      const away = teamAbbr(game.teams.away.team, teams);
      if (!home || !away) return [];

      const starter = (
        side: 'home' | 'away',
      ): ProbableStarter | null => {
        const probable = game.teams[side].probablePitcher;
        if (!probable) return null;
        return {
          playerId: String(probable.id),
          name: probable.fullName,
          team: side === 'home' ? home : away,
          opponent: side === 'home' ? away : home,
          isHome: side === 'home',
        };
      };

      return [
        {
          gameId: String(game.gamePk),
          date: game.officialDate,
          status: game.status.detailedState,
          home,
          away,
          probables: { home: starter('home'), away: starter('away') },
        },
      ];
    }),
  );

export const mapTeamStrength = (
  hitting: MlbTeamStatSplit[],
  pitching: MlbTeamStatSplit[],
  teams: TeamAbbreviations,
): TeamStrength[] => {
  const byTeam = new Map<string, TeamStrength>();

  const merge = (
    splits: MlbTeamStatSplit[],
    side: 'hitting' | 'pitching',
    keys: readonly string[],
  ) => {
    for (const split of splits) {
      const team = teamAbbr(split.team, teams);
      if (!team) continue;
      const entry = byTeam.get(team) ?? {
        team,
        gamesPlayed: 0,
        hitting: {},
        pitching: {},
      };
      entry[side] = pickStats(split.stat, keys);
      // Hitting games played is the team's own schedule; pitching matches it.
      entry.gamesPlayed = Math.max(
        entry.gamesPlayed,
        toNumber(split.stat.gamesPlayed) ?? 0,
      );
      byTeam.set(team, entry);
    }
  };

  merge(hitting, MLB_GROUP_KEYS.hitting, MLB_TEAM_STAT_KEYS.hitting);
  merge(pitching, MLB_GROUP_KEYS.pitching, MLB_TEAM_STAT_KEYS.pitching);

  return [...byTeam.values()];
};

/** Codes are authoritative; the wording is the fallback for the long tail. */
export const availabilityFor = (status: {
  code: string;
  description: string;
}): Availability => {
  const byCode = MLB_STATUS_CODES[status.code.toUpperCase()];
  if (byCode) return byCode;

  const description = status.description.toLowerCase();
  return (
    MLB_STATUS_KEYWORDS.find(({ match }) => description.includes(match))
      ?.availability ?? AVAILABILITY.inactive
  );
};

export const mapRoster = (
  entries: MlbRosterEntry[],
  team: string | null,
): PlayerStatus[] =>
  entries.map((entry) => ({
    playerId: String(entry.person.id),
    name: entry.person.fullName,
    team,
    position: entry.position?.abbreviation ?? null,
    status: entry.status.description,
    availability: availabilityFor(entry.status),
  }));
