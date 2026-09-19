import { PREVIEW_DEFAULTS } from '../sports.constants.js';
import type {
  PreviewLeader,
  ScheduledGame,
  ScoredStatLine,
  SeriesGame,
  StatGroup,
  StatValues,
  TeamRecord,
} from '../sports.types.js';
import { toIsoDate } from '../sports.utils.js';
import { toSeriesGame, winnerOf } from './head-to-head.js';

const emptyRecord = (): TeamRecord => ({
  wins: 0,
  losses: 0,
  ties: 0,
  scoredFor: 0,
  scoredAgainst: 0,
});

/**
 * One club's won-lost line over the games it has actually finished. A game
 * still to come is not a loss and a game in progress is not a result, so both
 * are simply absent — the same rule the series record follows.
 */
export const teamRecord = (
  games: ScheduledGame[],
  team: string,
): TeamRecord => {
  const record = emptyRecord();

  for (const game of games) {
    if (!game.score) continue;
    const isHome = game.home === team;
    if (!isHome && game.away !== team) continue;

    record.scoredFor += isHome ? game.score.home : game.score.away;
    record.scoredAgainst += isHome ? game.score.away : game.score.home;

    const winner = winnerOf(game);
    if (winner === team) record.wins += 1;
    else if (winner) record.losses += 1;
    else record.ties += 1;
  }

  return record;
};

/**
 * The club's latest results, newest first. A preview is asked before a game,
 * so "how are they going in" is the top of the list rather than the bottom of
 * a chronological one.
 */
export const recentResults = (
  games: ScheduledGame[],
  limit: number = PREVIEW_DEFAULTS.recentGames,
): SeriesGame[] =>
  [...games]
    .filter(({ score }) => score !== null)
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, limit)
    .map(toSeriesGame);

/**
 * A club's production summed from its own players, for a sport whose upstream
 * publishes no team line. Only summable stats are added up: a completion
 * percentage is not a quantity, and adding eleven of them would produce a
 * number that looks like a team rate and is not one.
 */
export const sumTeamStats = (
  rows: ScoredStatLine[],
  group: StatGroup,
): StatValues => {
  const totals: StatValues = {};

  for (const { key, summable } of group.stats) {
    if (!summable) continue;
    const values = rows
      .map(({ stats }) => stats[key])
      .filter((value): value is number => typeof value === 'number');
    if (values.length) {
      totals[key] = values.reduce((sum, value) => sum + value, 0);
    }
  }

  return totals;
};

/**
 * The club's biggest fantasy scorers, which is what a preview is really being
 * asked about: two team lines are context, the players are the decision.
 */
export const teamLeaders = (
  rows: ScoredStatLine[],
  keys: string[],
  limit: number = PREVIEW_DEFAULTS.leaders,
): PreviewLeader[] =>
  [...rows]
    .sort(
      (a, b) =>
        b.fantasyPoints - a.fantasyPoints ||
        a.player.name.localeCompare(b.player.name),
    )
    .slice(0, limit)
    .map(({ player, gamesPlayed, fantasyPoints, fantasyPointsPerGame, stats }) => ({
      player,
      gamesPlayed,
      fantasyPoints,
      pointsPerGame: fantasyPointsPerGame,
      stats: Object.fromEntries(
        keys.flatMap((key) => (key in stats ? [[key, stats[key]]] : [])),
      ),
    }));

/**
 * The game a preview is about: the one named, else the next one still to come,
 * else the last meeting there was. "Still to come" is measured against today
 * and not merely against having a score, because a postponed game keeps no
 * score for ever and would otherwise be previewed as the next meeting months
 * after it was called off. A season whose fixtures are all behind them is a
 * real state of affairs, so the last one is reported rather than nothing.
 */
export const selectPreviewGame = (
  games: SeriesGame[],
  gameId?: string,
): { game: SeriesGame | null; isUpcoming: boolean } => {
  if (gameId) {
    const named = games.find((game) => game.gameId === gameId) ?? null;
    return { game: named, isUpcoming: named?.score === null };
  }

  const ordered = [...games].sort((a, b) => a.date.localeCompare(b.date));
  const today = toIsoDate(new Date());
  const next = ordered.find(
    ({ score, date }) => score === null && date >= today,
  );

  return next
    ? { game: next, isUpcoming: true }
    : { game: ordered[ordered.length - 1] ?? null, isUpcoming: false };
};
