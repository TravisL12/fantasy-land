import { DATA_KINDS } from '../../sports.constants.js';
import type {
  DataKind,
  GameLogEntry,
  PlayerRef,
  StatGroup,
  StatLine,
} from '../../sports.types.js';
import { pickStats } from '../provider.utils.js';
import { NFL_DERIVED_RATES, NFL_GROUP_KEYS } from './nfl.constants.js';
import type {
  SleeperPlayerInfo,
  SleeperStatEntry,
  SleeperWeeklyLog,
} from './nfl.types.js';

const statKeys = (group: StatGroup) => group.stats.map(({ key }) => key);

export const toPlayerRef = (
  id: string,
  info?: SleeperPlayerInfo | null,
): PlayerRef => ({
  id,
  name: [info?.first_name, info?.last_name].filter(Boolean).join(' ') || id,
  team: info?.team ?? null,
  position: info?.position ?? null,
});

export const groupForPosition = (position: string | null) => {
  if (position === 'K') return NFL_GROUP_KEYS.kicking;
  if (position === 'DEF') return NFL_GROUP_KEYS.defense;
  return NFL_GROUP_KEYS.offense;
};

/** Sleeper returns rows for every rostered player; keep only ones with data. */
const hasData = (entry: SleeperStatEntry, kind: DataKind, week?: number) =>
  kind === DATA_KINDS.projections
    ? (entry.stats.pts_ppr ?? 0) !== 0
    : (entry.stats.gp ?? (week ? 1 : 0)) > 0 &&
      Object.keys(entry.stats).length > 0;

export const mapStatLines = (
  entries: SleeperStatEntry[],
  group: StatGroup,
  kind: DataKind,
): StatLine[] =>
  entries
    .filter((entry) => hasData(entry, kind))
    .map((entry) => ({
      player: {
        ...toPlayerRef(entry.player_id, entry.player),
        team: entry.team ?? entry.player?.team ?? null,
      },
      gamesPlayed: entry.stats.gp ?? 0,
      stats: pickStats(entry.stats, statKeys(group)),
    }));

export const mapWeeklyLog = (
  log: SleeperWeeklyLog,
  group: StatGroup,
): GameLogEntry[] =>
  Object.values(log)
    .filter(
      (entry): entry is SleeperStatEntry =>
        !!entry && (entry.stats.gp ?? 0) > 0,
    )
    .map((entry) => ({
      date: entry.date,
      week: entry.week,
      opponent: entry.opponent ?? null,
      isHome: entry.is_away_team === undefined ? null : !entry.is_away_team,
      stats: pickStats(entry.stats, statKeys(group)),
    }))
    .sort((a, b) => (a.week ?? 0) - (b.week ?? 0));

const round = (value: number) => Math.round(value * 100) / 100;

/** Sums weekly stat lines into season lines, then rebuilds rate stats from the totals. */
export const aggregateStatLines = (
  weeks: StatLine[][],
  group: StatGroup,
): StatLine[] => {
  const summable = group.stats.filter((s) => s.summable).map((s) => s.key);
  const rates = group.stats
    .map((s) => s.key)
    .filter((key) => key in NFL_DERIVED_RATES);
  const players = new Map<string, StatLine>();

  for (const lines of weeks) {
    for (const line of lines) {
      const existing = players.get(line.player.id);
      if (!existing) {
        players.set(line.player.id, {
          ...line,
          stats: pickStats(line.stats, summable),
        });
        continue;
      }
      // Later weeks win for team, so traded players show their current team.
      existing.player = line.player;
      existing.gamesPlayed += line.gamesPlayed;
      for (const key of summable) {
        if (line.stats[key] !== undefined) {
          existing.stats[key] = round(
            (existing.stats[key] ?? 0) + line.stats[key],
          );
        }
      }
    }
  }

  return [...players.values()].map((line) => {
    for (const key of rates) {
      const [numerator, denominator, multiplier] = NFL_DERIVED_RATES[key];
      const top = line.stats[numerator];
      const bottom = line.stats[denominator];
      if (top !== undefined && bottom)
        line.stats[key] = round((top / bottom) * multiplier);
    }
    return line;
  });
};
