import { mean, round } from '../../../common/math/number.js';
import {
  SERIES_DEFAULTS,
  WINDOW_DEFAULTS,
} from '../sports.constants.js';
import type {
  HeadToHeadGame,
  HeadToHeadRecord,
  PlayerHeadToHead,
  PlayerRef,
  ScheduledGame,
  ScoredGameLogEntry,
  SeriesGame,
  SeriesRecord,
  TeamSeries,
} from '../sports.types.js';

/**
 * Games are matched on week where the sport has one and on date otherwise.
 * Week wins because a Thursday and a Sunday game are the same fantasy week —
 * matching those two players on date would drop the game from the comparison.
 */
const gameKey = ({ date, week }: Pick<ScoredGameLogEntry, 'date' | 'week'>) =>
  week === null ? date : `week:${week}`;

interface ComparedPlayer {
  player: PlayerRef;
  entries: ScoredGameLogEntry[];
}

/**
 * Head-to-head over the games every compared player actually played. Comparing
 * season averages rewards whoever played the softer schedule; this only counts
 * the days they both suited up, which is the start/sit question.
 */
export const playerHeadToHead = (
  players: ComparedPlayer[],
): PlayerHeadToHead => {
  const byKey = players.map(
    ({ entries }) =>
      new Map(
        entries.flatMap((entry) => {
          const key = gameKey(entry);
          return key ? ([[key, entry]] as const) : [];
        }),
      ),
  );

  const shared = [...(byKey[0]?.keys() ?? [])]
    .filter((key) => byKey.every((map) => map.has(key)))
    .sort();

  const games: HeadToHeadGame[] = shared.map((key) => {
    const entries = byKey.map((map) => map.get(key) as ScoredGameLogEntry);
    const points = Object.fromEntries(
      players.map(({ player }, index) => [
        player.id,
        entries[index].fantasyPoints,
      ]),
    );
    const best = Math.max(...entries.map((entry) => entry.fantasyPoints));
    const winners = players.filter(
      ({ player }) => points[player.id] === best,
    );

    return {
      date: entries[0].date,
      week: entries[0].week,
      points,
      winner: winners.length === 1 ? winners[0].player.id : null,
    };
  });

  const records: HeadToHeadRecord[] = players.map(({ player }) => {
    const margins = games.map((game) => {
      const others = players
        .filter(({ player: other }) => other.id !== player.id)
        .map(({ player: other }) => game.points[other.id]);
      return game.points[player.id] - mean(others);
    });

    return {
      playerId: player.id,
      name: player.name,
      wins: games.filter((game) => game.winner === player.id).length,
      ties: games.filter((game) => game.winner === null).length,
      averageMargin: margins.length ? round(mean(margins)) : 0,
    };
  });

  const mostWins = Math.max(0, ...records.map(({ wins }) => wins));
  const leaders = records.filter(({ wins }) => wins === mostWins);

  return {
    sharedGames: games.length,
    records,
    leader:
      games.length && leaders.length === 1 ? leaders[0].playerId : null,
    games: games.slice(-WINDOW_DEFAULTS.maxHeadToHeadGames),
  };
};

/** Null for a draw as well as for a game not yet played — neither is a win. */
export const winnerOf = ({ home, away, score }: ScheduledGame): string | null => {
  if (!score || score.home === score.away) return null;
  return score.home > score.away ? home : away;
};

/** A fixture as a result: the same game with its winner worked out. */
export const toSeriesGame = (game: ScheduledGame): SeriesGame => ({
  gameId: game.gameId,
  date: game.date,
  week: game.week,
  status: game.status,
  home: game.home,
  away: game.away,
  score: game.score,
  winner: winnerOf(game),
});

const emptyRecord = (team: string): SeriesRecord => ({
  team,
  wins: 0,
  losses: 0,
  ties: 0,
  scoredFor: 0,
  scoredAgainst: 0,
  homeWins: 0,
  awayWins: 0,
});

/**
 * Folds two teams' meetings into a record. Only games with a final score count
 * towards it — anything still scheduled is reported as upcoming instead, so a
 * series in progress is never read as a losing one.
 */
export const teamSeries = (
  games: ScheduledGame[],
  teams: [string, string],
): TeamSeries => {
  const ordered = [...games].sort((a, b) => a.date.localeCompare(b.date));
  const records: [SeriesRecord, SeriesRecord] = [
    emptyRecord(teams[0]),
    emptyRecord(teams[1]),
  ];
  const recordFor = (team: string) =>
    records.find((record) => record.team === team);

  const serialized: SeriesGame[] = ordered.map((game) => {
    const winner = winnerOf(game);

    if (game.score) {
      for (const [team, scored, allowed, isHome] of [
        [game.home, game.score.home, game.score.away, true],
        [game.away, game.score.away, game.score.home, false],
      ] as const) {
        const record = recordFor(team);
        if (!record) continue;
        record.scoredFor += scored;
        record.scoredAgainst += allowed;
        if (winner === team) {
          record.wins += 1;
          if (isHome) record.homeWins += 1;
          else record.awayWins += 1;
        } else if (winner) {
          record.losses += 1;
        } else {
          // A finished game with no winner is a draw, which football has.
          record.ties += 1;
        }
      }
    }

    return toSeriesGame(game);
  });

  const upcoming = serialized.filter(({ score }) => score === null);

  return {
    teams,
    played: serialized.length - upcoming.length,
    upcoming: upcoming.length,
    nextMeeting: upcoming[0]?.date ?? null,
    records,
    games: serialized.slice(0, SERIES_DEFAULTS.maxGames),
  };
};
