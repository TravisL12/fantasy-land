import { Injectable } from '@nestjs/common';
import {
  fetchJson,
  fetchJsonOrNull,
} from '../../../../common/http/fetch-json.js';
import { CACHE_TTL } from '../../../data-cache/data-cache.constants.js';
import { DataCacheService } from '../../../data-cache/data-cache.service.js';
import { DATA_KINDS, SPORT_KEYS } from '../../sports.constants.js';
import type {
  DirectoryPlayer,
  GameLog,
  GameLogQuery,
  HeadToHeadQuery,
  OpportunityProvider,
  PlayerDirectoryProvider,
  ScheduledGame,
  ScheduleProvider,
  ScheduleQuery,
  SportCatalog,
  StandingsGroup,
  StandingsProvider,
  StatLine,
  StatLinesQuery,
  TeamGamesQuery,
} from '../../sports.types.js';
import {
  espnScoreboardUrl,
  espnStandingsUrl,
  NFL_CATALOG_BASE,
  NFL_FINAL_STATUS,
  NFL_SETTLED_STATUSES,
  NFL_UPCOMING_STATUSES,
  NFL_FIRST_SEASON,
  NFL_GROUPS,
  NFL_OPPORTUNITY_STATS,
  NFL_REGULAR_SEASON_WEEKS,
  SLEEPER_API,
  SLEEPER_PLAYERS_URL,
  SLEEPER_SEASON_TYPE,
  SLEEPER_STATE_URL,
  sleeperScheduleUrl,
} from './nfl.constants.js';
import {
  cacheKeyFor,
  findGroup,
  seasonRange,
  seasonTtl,
} from '../provider.utils.js';
import {
  aggregateStatLines,
  groupForPosition,
  mapDirectory,
  mapSchedule,
  mapScoreboard,
  mapStandings,
  mapStatLines,
  mapWeeklyLog,
  toPlayerRef,
} from './nfl.mapper.js';
import type {
  EspnScoreboard,
  EspnStandings,
  SleeperDirectory,
  SleeperPlayerInfo,
  SleeperScheduleGame,
  SleeperStatEntry,
  SleeperState,
  SleeperWeeklyLog,
} from './nfl.types.js';

const cacheKey = cacheKeyFor(SPORT_KEYS.nfl);

@Injectable()
export class NflProvider
  implements
    OpportunityProvider,
    PlayerDirectoryProvider,
    ScheduleProvider,
    StandingsProvider
{
  readonly key = SPORT_KEYS.nfl;
  readonly opportunityStats = NFL_OPPORTUNITY_STATS;

  constructor(private readonly cache: DataCacheService) {}

  async getCatalog(): Promise<SportCatalog> {
    const state = await this.getState();
    const current = Number(state.season);
    const defaultSeason = state.season_has_scores
      ? state.season
      : state.previous_season;

    return {
      ...NFL_CATALOG_BASE,
      dataKinds: [...NFL_CATALOG_BASE.dataKinds],
      seasons: seasonRange(NFL_FIRST_SEASON, current),
      defaultSeason,
      weeks: Array.from({ length: NFL_REGULAR_SEASON_WEEKS }, (_, i) => i + 1),
      currentWeek: defaultSeason === state.season ? state.display_week : null,
    };
  }

  async getStatLines(query: StatLinesQuery): Promise<StatLine[]> {
    const { season, week, group, kind } = query;
    if (week !== undefined || kind === DATA_KINDS.projections) {
      return this.fetchStatLines(query);
    }

    const statGroup = findGroup(NFL_GROUPS, group);
    const ttl = await this.ttlForSeason(season);
    return this.cache.wrap(
      cacheKey(kind, season, 'season', group),
      ttl,
      async () => {
        const weeks = await this.playedWeeks(season);
        const weekly = await Promise.all(
          weeks.map((w) => this.fetchStatLines({ ...query, week: w })),
        );
        return aggregateStatLines(weekly, statGroup);
      },
    );
  }

  private async fetchStatLines({ season, week, group, kind }: StatLinesQuery) {
    const statGroup = findGroup(NFL_GROUPS, group);
    const ttl = await this.ttlForSeason(season);

    return this.cache.wrap(
      cacheKey(kind, season, week, group),
      ttl,
      async () => {
        const positions = statGroup.positions
          .map((p) => `position[]=${encodeURIComponent(p)}`)
          .join('&');
        const path = [kind, 'nfl', season, week]
          .filter((p) => p !== undefined)
          .join('/');
        const entries = await fetchJson<SleeperStatEntry[]>(
          `${SLEEPER_API}/${path}?season_type=${SLEEPER_SEASON_TYPE}&${positions}`,
        );
        return mapStatLines(entries, statGroup, kind);
      },
    );
  }

  /** Every regular-season week for past seasons; weeks so far for the current one. */
  private async playedWeeks(season: string) {
    const state = await this.getState();
    const last =
      season === state.season
        ? Math.min(state.week, NFL_REGULAR_SEASON_WEEKS)
        : NFL_REGULAR_SEASON_WEEKS;
    return Array.from({ length: last }, (_, i) => i + 1);
  }

  /**
   * The league's whole player list, refreshed at most once a day — the rate
   * upstream asks for, and enough for a roster that changes with signings and
   * injuries rather than with the ball. `DataCacheService` keeps it in memory,
   * backs it with Postgres so a restart does not re-pull 14MB, and serves the
   * last copy if upstream is down.
   */
  getPlayerDirectory(): Promise<DirectoryPlayer[]> {
    return this.cache.wrap(cacheKey('directory'), CACHE_TTL.daily, async () =>
      mapDirectory(await fetchJson<SleeperDirectory>(SLEEPER_PLAYERS_URL)),
    );
  }

  async getGameLog({
    playerId,
    season,
  }: GameLogQuery): Promise<GameLog | null> {
    const player = await this.playerRef(playerId);
    if (!player) return null;

    const statGroup = findGroup(NFL_GROUPS, groupForPosition(player.position));
    const ttl = await this.ttlForSeason(season);
    const entries = await this.cache.wrap(
      cacheKey('log', season, playerId),
      ttl,
      async () =>
        mapWeeklyLog(
          await fetchJson<SleeperWeeklyLog>(
            `${SLEEPER_API}/stats/nfl/player/${encodeURIComponent(playerId)}` +
              `?season_type=${SLEEPER_SEASON_TYPE}&season=${season}&grouping=week`,
          ),
          statGroup,
        ),
    );

    return { player, group: statGroup.key, entries };
  }

  /**
   * The table. ESPN owns it, as it owns the scores — Sleeper publishes no
   * standings at all. Games remaining come from the fixture list we already
   * hold, so the clinch engine above the provider has what it needs without a
   * second request.
   */
  async getStandings(season: string): Promise<StandingsGroup[]> {
    const ttl = await this.ttlForSeason(season);
    const remaining = await this.gamesRemaining(season);

    return this.cache.wrap(cacheKey('standings', season), ttl, async () =>
      mapStandings(
        (await fetchJsonOrNull<EspnStandings>(espnStandingsUrl(season))) ?? {},
        remaining,
      ),
    );
  }

  /** How many fixtures each club has left, counted off the season schedule. */
  private async gamesRemaining(season: string) {
    const games = await this.seasonSchedule(season);
    const left = new Map<string, number>();

    for (const game of games) {
      if (!NFL_UPCOMING_STATUSES.includes(game.status)) continue;
      for (const team of [game.home, game.away]) {
        left.set(team, (left.get(team) ?? 0) + 1);
      }
    }

    return left;
  }

  /**
   * Fixtures for a window. The whole season arrives in one small payload, so
   * it is fetched once per season and filtered in memory — a week or a date
   * range costs the same single request, and an already-cached season costs
   * none.
   */
  async getSchedule({
    season,
    startDate,
    endDate,
    weeks,
  }: ScheduleQuery): Promise<ScheduledGame[]> {
    const games = await this.seasonSchedule(season);
    const wanted = weeks?.length ? new Set(weeks) : null;

    return games.filter(
      (game) =>
        (!wanted || (game.week !== null && wanted.has(game.week))) &&
        (!startDate || game.date >= startDate) &&
        (!endDate || game.date <= endDate),
    );
  }

  async getHeadToHead({
    season,
    teams,
    startDate,
    endDate,
  }: HeadToHeadQuery): Promise<ScheduledGame[]> {
    const [a, b] = teams.map((team) => team.toUpperCase());
    const games = await this.getSchedule({ season, startDate, endDate });

    return games.filter(
      ({ home, away }) =>
        (home === a && away === b) || (home === b && away === a),
    );
  }

  async getTeamGames({
    season,
    team,
    startDate,
    endDate,
  }: TeamGamesQuery): Promise<ScheduledGame[]> {
    const wanted = team.toUpperCase();
    const games = await this.getSchedule({ season, startDate, endDate });
    return games.filter(
      ({ home, away }) => home === wanted || away === wanted,
    );
  }

  /**
   * The season's fixtures with every finished game's score attached. Sleeper
   * publishes no scores at all, so finals come from ESPN — but only for the
   * weeks that already hold a finished game, which is why an unplayed season
   * costs nothing beyond the fixture list.
   */
  private async seasonSchedule(season: string): Promise<ScheduledGame[]> {
    return this.cache.wrap(
      cacheKey('schedule', season),
      await this.ttlForSeason(season),
      async () => {
        const fixtures = await fetchJson<SleeperScheduleGame[]>(
          sleeperScheduleUrl(season),
        );
        const boards = await Promise.all(
          finishedWeeks(fixtures).map(({ week, settled }) =>
            this.weekScores(season, week, settled),
          ),
        );
        return mapSchedule(fixtures, new Map(boards.flatMap((b) => [...b])));
      },
    );
  }

  /**
   * One week of final scores. A week whose games are all over cannot change
   * again, so it is cached as an archived season is however live the rest of
   * the season still is — otherwise every refresh re-pulls all eighteen.
   * A scoreboard that fails to load leaves those games score-less rather than
   * taking the fixture list down with it.
   */
  private async weekScores(season: string, week: number, settled: boolean) {
    const entries = await this.cache.wrap(
      cacheKey('scores', season, week),
      settled ? CACHE_TTL.archived : CACHE_TTL.live,
      async () => [
        ...mapScoreboard(
          (await fetchJsonOrNull<EspnScoreboard>(
            espnScoreboardUrl(season, week),
          )) ?? {},
        ),
      ],
    );
    return new Map(entries);
  }

  /**
   * Who a player id belongs to. The directory answers for anyone who can
   * score, so the per-player fetch is only reached for the rest — which is the
   * point of holding the whole list: one daily request in place of one per
   * player looked up.
   */
  private async playerRef(playerId: string) {
    const directory = await this.getPlayerDirectory();
    const known = directory.find(({ id }) => id === playerId);
    if (known) {
      const { id, name, team, position } = known;
      return { id, name, team, position };
    }

    const info = await this.cache.wrap(
      cacheKey('player', playerId),
      CACHE_TTL.daily,
      () =>
        fetchJson<SleeperPlayerInfo | null>(
          `${SLEEPER_API}/players/nfl/${encodeURIComponent(playerId)}`,
        ),
    );
    return info ? toPlayerRef(playerId, info) : null;
  }

  private getState() {
    return this.cache.wrap(cacheKey('state'), CACHE_TTL.hourly, () =>
      fetchJson<SleeperState>(SLEEPER_STATE_URL),
    );
  }

  private async ttlForSeason(season: string) {
    const { season: current } = await this.getState();
    return seasonTtl(season, current);
  }
}

/**
 * Weeks worth asking ESPN about, and whether each one is done. `settled` is
 * what lets a finished week be cached for good in the middle of a live
 * season; a week with one game still to play is not settled, however many of
 * its others are final.
 */
const finishedWeeks = (fixtures: SleeperScheduleGame[]) => {
  const weeks = new Map<number, { played: number; pending: number }>();
  for (const { week, status } of fixtures) {
    const entry = weeks.get(week) ?? { played: 0, pending: 0 };
    if (status === NFL_FINAL_STATUS) entry.played += 1;
    if (!NFL_SETTLED_STATUSES.includes(status)) entry.pending += 1;
    weeks.set(week, entry);
  }

  return [...weeks]
    .filter(([, { played }]) => played > 0)
    .map(([week, { pending }]) => ({ week, settled: pending === 0 }));
};
