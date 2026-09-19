import { round } from '../../../../common/math/number.js';
import {
  AVAILABILITY,
  CLINCH_STATUS,
  DATA_KINDS,
} from '../../sports.constants.js';
import type {
  Availability,
  DataKind,
  DirectoryPlayer,
  GameLogEntry,
  PlayerRef,
  ScheduledGame,
  StandingsEntry,
  StandingsGroup,
  StatGroup,
  StatLine,
} from '../../sports.types.js';
import { pickStats } from '../provider.utils.js';
import {
  ESPN_TEAM_ALIASES,
  NFL_AVAILABILITY,
  NFL_CLINCH_NOTES,
  NFL_ELIMINATED_INDICATOR,
  NFL_SEASON_GAMES,
  NFL_DERIVED_RATES,
  NFL_FANTASY_POSITIONS,
  NFL_FINAL_STATUS,
  NFL_GAME_STATUSES,
  NFL_GROUP_KEYS,
  NFL_INJURY_STATUSES,
} from './nfl.constants.js';
import type {
  EspnScoreboard,
  EspnStandings,
  EspnStandingsEntry,
  SleeperDirectory,
  SleeperDirectoryEntry,
  SleeperPlayerInfo,
  SleeperScheduleGame,
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

/**
 * A game-status designation beats the roster status: a player whose team still
 * lists them Active but who is Out this week is not available to start.
 */
const availabilityOf = ({
  status,
  injury_status: injury,
}: SleeperDirectoryEntry): Availability => {
  if (injury && NFL_INJURY_STATUSES.includes(injury)) {
    return AVAILABILITY.injured;
  }
  return NFL_AVAILABILITY[status ?? ''] ?? AVAILABILITY.inactive;
};

/**
 * The league's whole player list, cut down to the players who can score in a
 * fantasy lineup. Upstream ships ~12k entries and 14MB, most of it linemen,
 * scouting fields and third-party ids we never read; what is cached is this
 * projection, about 400KB, in keeping with caching normalized data rather than
 * raw payloads.
 */
export const mapDirectory = (directory: SleeperDirectory): DirectoryPlayer[] =>
  Object.entries(directory).flatMap(([id, entry]): DirectoryPlayer[] => {
    if (!entry) return [];

    const positions = entry.fantasy_positions ?? [];
    if (!positions.some((position) => NFL_FANTASY_POSITIONS.includes(position))) {
      return [];
    }

    const name =
      entry.full_name?.trim() ||
      [entry.first_name, entry.last_name].filter(Boolean).join(' ');
    if (!name) return [];

    const position = entry.position ?? positions[0] ?? null;
    return [
      {
        id: entry.player_id ?? id,
        name,
        team: entry.team ?? null,
        position,
        group: groupForPosition(position),
        status: entry.status ?? null,
        availability: availabilityOf(entry),
        rank: entry.search_rank ?? null,
      },
    ];
  });

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

const espnTeam = (abbreviation: string | null | undefined) =>
  abbreviation ? ESPN_TEAM_ALIASES[abbreviation] ?? abbreviation : null;

/** A final score keyed by the two clubs, so a fixture can find its own result. */
export const scoreKey = (home: string, away: string) => `${away}@${home}`;

/**
 * Final scores out of one week of ESPN's scoreboard. A game still in progress
 * carries a running score upstream; it is dropped here for the same reason
 * baseball drops one, so a live game can never be counted as a result.
 */
export const mapScoreboard = (
  scoreboard: EspnScoreboard,
): Map<string, { home: number; away: number }> => {
  const scores = new Map<string, { home: number; away: number }>();

  for (const event of scoreboard.events ?? []) {
    for (const competition of event.competitions ?? []) {
      if (!competition.status?.type?.completed) continue;

      const sides = Object.fromEntries(
        (competition.competitors ?? []).map((competitor) => [
          competitor.homeAway,
          {
            team: espnTeam(competitor.team?.abbreviation),
            score: Number(competitor.score),
          },
        ]),
      );
      const { home, away } = sides;
      if (!home?.team || !away?.team) continue;
      if (!Number.isFinite(home.score) || !Number.isFinite(away.score)) continue;

      scores.set(scoreKey(home.team, away.team), {
        home: home.score,
        away: away.score,
      });
    }
  }

  return scores;
};

/**
 * Sleeper fixtures, with each finished game's score attached from ESPN. There
 * are no probable starters in football the way there are in baseball, so that
 * side of a ScheduledGame is always empty rather than invented.
 */
export const mapSchedule = (
  games: SleeperScheduleGame[],
  scores: Map<string, { home: number; away: number }>,
): ScheduledGame[] =>
  games
    .filter(({ home, away }) => home && away)
    .map((game) => ({
      gameId: game.game_id,
      date: game.date,
      week: game.week,
      status: NFL_GAME_STATUSES[game.status] ?? game.status,
      home: game.home,
      away: game.away,
      probables: { home: null, away: null },
      score:
        game.status === NFL_FINAL_STATUS
          ? scores.get(scoreKey(game.home, game.away)) ?? null
          : null,
    }));

/** ESPN gives each row as a named stat list rather than as fields. */
const statValues = ({ stats }: EspnStandingsEntry) =>
  new Map(
    (stats ?? []).flatMap((stat) =>
      stat.name ? ([[stat.name, stat]] as const) : [],
    ),
  );

/**
 * The league table. ESPN publishes its one-letter clinch shorthand only once a
 * club's place is settled, so the countdown to it is computed by the caller —
 * everything here is what upstream actually said.
 */
export const mapStandings = (
  standings: EspnStandings,
  gamesRemaining: Map<string, number>,
): StandingsGroup[] =>
  (standings.children ?? []).flatMap((conference) =>
    (conference.children ?? []).flatMap((division) => {
      const entries = division.standings?.entries ?? [];
      if (!entries.length) return [];

      // Upstream does not order a finished division by record — it put a
      // 14-3 conference leader fourth — so the table is ranked here.
      const ranked = [...entries].sort(
        (a, b) => winPercent(b) - winPercent(a) || wins(b) - wins(a),
      );

      return [
        {
          // Upstream abbreviates a division as "EAST", which both conferences
          // would answer to; the full name is what makes the key unique.
          key: division.name ?? division.abbreviation ?? '',
          name: division.name ?? '',
          conference: conference.abbreviation ?? conference.name ?? null,
          teams: ranked.map((entry, index) =>
            mapStandingsEntry(entry, gamesRemaining, index),
          ),
        },
      ];
    }),
  );

const statNumber = (entry: EspnStandingsEntry, name: string) =>
  statValues(entry).get(name)?.value ?? 0;

const winPercent = (entry: EspnStandingsEntry) =>
  statNumber(entry, 'winPercent');
const wins = (entry: EspnStandingsEntry) => statNumber(entry, 'wins');

const mapStandingsEntry = (
  entry: EspnStandingsEntry,
  gamesRemaining: Map<string, number>,
  index: number,
): StandingsEntry => {
  const stats = statValues(entry);
  const number = (name: string) => stats.get(name)?.value ?? null;
  // Upstream writes "-" for a club that leads and 0 for one level with the
  // lead. Only the first is "behind nobody"; treating 0 as absent would hide
  // a real tie at the top.
  const behind = stats.get('gamesBehind');
  const team = espnTeam(entry.team?.abbreviation) ?? '';
  const indicator = stats.get('clincher')?.displayValue;
  const wins = number('wins') ?? 0;
  const losses = number('losses') ?? 0;
  const ties = number('ties') ?? 0;

  return {
    team,
    name: entry.team?.displayName ?? team,
    wins,
    losses,
    ties,
    winPct: number('winPercent') ?? 0,
    gamesPlayed: wins + losses + ties,
    gamesRemaining:
      gamesRemaining.get(team) ??
      Math.max(0, NFL_SEASON_GAMES - (wins + losses + ties)),
    gamesBack: behind?.displayValue === '-' ? null : behind?.value ?? null,
    scoredFor: number('pointsFor') ?? 0,
    scoredAgainst: number('pointsAgainst') ?? 0,
    streak: stats.get('streak')?.displayValue ?? null,
    rank: index + 1,
    playoffSeed: number('playoffSeed'),
    clinch: indicator
      ? indicator === NFL_ELIMINATED_INDICATOR
        ? CLINCH_STATUS.eliminated
        : CLINCH_STATUS.clinched
      : CLINCH_STATUS.contending,
    clinchNote: indicator ? NFL_CLINCH_NOTES[indicator] ?? indicator : null,
    // Upstream publishes neither, so both are left for the clinch engine.
    magicNumber: null,
    eliminationNumber: null,
    // Football's wild card is not tracked as a separate race upstream; the
    // playoff seed already says whether a club is in one of those places.
    wildCard: null,
  };
};
