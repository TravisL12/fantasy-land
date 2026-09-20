import { Injectable } from '@nestjs/common';
import {
  fetchJson,
  fetchJsonOrNull,
} from '../../../../common/http/fetch-json.js';
import { CACHE_TTL } from '../../../data-cache/data-cache.constants.js';
import { DataCacheService } from '../../../data-cache/data-cache.service.js';
import { SPORT_KEYS } from '../../sports.constants.js';
import type {
  DateRange,
  GameLog,
  GameLogQuery,
  HeadToHeadQuery,
  LeagueDataProvider,
  MatchupMetric,
  MatchupSide,
  PlayerStatus,
  ScheduledGame,
  ScheduleQuery,
  SportCatalog,
  StandingsGroup,
  StandingsProvider,
  TeamGamesQuery,
  StatLinesQuery,
  TeamStrength,
  WindowedStatsProvider,
  WindowedStatsQuery,
} from '../../sports.types.js';
import { STAT_WINDOW_KINDS } from '../../sports.types.js';
import {
  cacheKeyFor,
  findGroup,
  seasonRange,
  seasonTtl,
} from '../provider.utils.js';
import {
  MLB_API,
  MLB_LEAGUE_IDS,
  MLB_STANDINGS_TYPE,
  MLB_CATALOG_BASE,
  MLB_GAME_TYPE,
  MLB_FIRST_SEASON,
  MLB_GROUP_KEYS,
  MLB_GROUPS,
  MLB_MATCHUP_METRICS,
  MLB_ROSTER_TYPE,
  MLB_SPORT_ID,
  MLB_STATS_TYPES,
  MLB_STATS_PAGE_SIZE,
} from './mlb.constants.js';
import {
  groupForPerson,
  mapGameLog,
  mapRoster,
  mapSchedule,
  mapSeasonSplits,
  mapStandings,
  mapTeamStrength,
  pitchingRole,
  teamId,
  type TeamAbbreviations,
  toPlayerRef,
} from './mlb.mapper.js';
import type {
  MlbPeopleResponse,
  MlbRosterResponse,
  MlbScheduleResponse,
  MlbSeasonsResponse,
  MlbSeasonSplit,
  MlbStandingsResponse,
  MlbStatsResponse,
  MlbTeamsResponse,
  MlbTeamStatSplit,
} from './mlb.types.js';

const cacheKey = cacheKeyFor(SPORT_KEYS.mlb);

@Injectable()
export class MlbProvider
  implements LeagueDataProvider, StandingsProvider, WindowedStatsProvider
{
  readonly key = SPORT_KEYS.mlb;
  /** Baseball has no weeks, so a window here is always a date range. */
  readonly windowKinds = [STAT_WINDOW_KINDS.dates] as const;
  readonly matchupMetrics: Record<MatchupSide, MatchupMetric[]> =
    MLB_MATCHUP_METRICS;

  constructor(private readonly cache: DataCacheService) {}

  async getCatalog(): Promise<SportCatalog> {
    const { seasonId, regularSeasonStartDate } = await this.getCurrentSeason();
    const current = Number(seasonId);
    const started = new Date(regularSeasonStartDate).getTime() <= Date.now();

    return {
      ...MLB_CATALOG_BASE,
      dataKinds: [...MLB_CATALOG_BASE.dataKinds],
      seasons: seasonRange(MLB_FIRST_SEASON, current),
      defaultSeason: started ? seasonId : String(current - 1),
    };
  }

  async getStatLines({ season, group }: StatLinesQuery) {
    return this.statLines(season, group, MLB_STATS_TYPES.season, '', 'stats');
  }

  /**
   * The same pool of players measured over part of the season. Upstream serves
   * a date range as one request with splits shaped exactly like the season's,
   * so this costs what a season leaderboard costs — the alternative, a game log
   * per player, would be hundreds of requests for one question.
   */
  async getWindowedStatLines({ season, group, window }: WindowedStatsQuery) {
    // Upstream wants both ends. An open-ended window is the rest of the season
    // in that direction, which is what "since the break" or "before June" mean.
    const startDate = window.startDate ?? `${season}-01-01`;
    const endDate = window.endDate ?? `${season}-12-31`;

    return this.statLines(
      season,
      group,
      MLB_STATS_TYPES.byDateRange,
      `&startDate=${startDate}&endDate=${endDate}`,
      'windowStats',
      startDate,
      endDate,
    );
  }

  private async statLines(
    season: string,
    group: string,
    statsType: string,
    extraParams: string,
    ...key: string[]
  ) {
    const statGroup = findGroup(MLB_GROUPS, group);
    const ttl = await this.ttlForSeason(season);

    return this.cache.wrap(cacheKey(...key, season, group), ttl, async () => {
      const [response, teams] = await Promise.all([
        fetchJson<MlbStatsResponse<MlbSeasonSplit>>(
          `${MLB_API}/stats?stats=${statsType}&group=${group}&season=${season}` +
            `&sportId=${MLB_SPORT_ID}&playerPool=ALL&limit=${MLB_STATS_PAGE_SIZE}` +
            extraParams,
        ),
        this.getTeams(season),
      ]);
      return mapSeasonSplits(response.stats[0]?.splits ?? [], statGroup, teams);
    });
  }

  async getGameLog({
    playerId,
    season,
    group,
  }: GameLogQuery): Promise<GameLog | null> {
    const ttl = await this.ttlForSeason(season);
    const groups = Object.values(MLB_GROUP_KEYS).join(',');

    return this.cache.wrap(
      cacheKey('log', season, playerId, group ?? 'auto'),
      ttl,
      async () => {
        const [response, teams] = await Promise.all([
          fetchJsonOrNull<MlbPeopleResponse>(
            `${MLB_API}/people/${encodeURIComponent(playerId)}?hydrate=currentTeam,` +
              `stats(group=[${groups}],type=[gameLog],season=${season})`,
          ),
          this.getTeams(season),
        ]);
        const person = response?.people[0];
        if (!person) return null;

        const statGroup = findGroup(
          MLB_GROUPS,
          group ?? groupForPerson(person),
        );
        const splits =
          person.stats?.find((s) => s.group.displayName === statGroup.key)
            ?.splits ?? [];

        const entries = mapGameLog(splits, statGroup, teams);
        const player = toPlayerRef(person, teams);
        if (statGroup.key === MLB_GROUP_KEYS.pitching) {
          player.position = pitchingRole({
            gamesPlayed: entries.length,
            gamesStarted: entries.filter((e) => e.stats.gamesStarted).length,
          });
        }

        return { player, group: statGroup.key, entries };
      },
    );
  }

  /**
   * Baseball has no weeks, so a window is always a date range. Both ends are
   * defaulted to the season's bounds so the signature stays honest, but the
   * service never actually asks for a whole season here — that is 2,400 games.
   */
  async getSchedule({
    season,
    startDate = seasonStart(season),
    endDate = seasonEnd(season),
  }: ScheduleQuery): Promise<ScheduledGame[]> {
    return this.cache.wrap(
      cacheKey('schedule', startDate, endDate),
      CACHE_TTL.live,
      async () => {
        const [response, teams] = await Promise.all([
          fetchJson<MlbScheduleResponse>(
            `${MLB_API}/schedule?sportId=${MLB_SPORT_ID}` +
              `&startDate=${startDate}&endDate=${endDate}&hydrate=probablePitcher`,
          ),
          this.getTeams(season),
        ]);
        return mapSchedule(response.dates, teams);
      },
    );
  }

  /**
   * Only the games these two played each other, straight from upstream — the
   * whole-season schedule would be 2,400 games to filter down to about a dozen.
   */
  async getHeadToHead({
    season,
    teams,
    startDate,
    endDate,
  }: HeadToHeadQuery): Promise<ScheduledGame[]> {
    const ttl = await this.ttlForSeason(season);
    const [home, away] = teams;

    return this.cache.wrap(
      cacheKey('headToHead', season, home, away, startDate ?? '', endDate ?? ''),
      ttl,
      async () => {
        const abbreviations = await this.getTeams(season);
        const ids = teams.map((team) => teamId(abbreviations, team));
        if (ids.some((id) => id === undefined)) return [];

        const response = await fetchJson<MlbScheduleResponse>(
          `${MLB_API}/schedule?sportId=${MLB_SPORT_ID}&season=${season}` +
            `&gameType=${MLB_GAME_TYPE}&teamId=${ids[0]}&opponentId=${ids[1]}` +
            (startDate && endDate
              ? `&startDate=${startDate}&endDate=${endDate}`
              : ''),
        );
        return mapSchedule(response.dates, abbreviations);
      },
    );
  }

  /**
   * One club's season, narrowed upstream by team id rather than filtered out
   * of the league-wide slate — 162 games instead of 2,430 for the same call.
   */
  async getTeamGames({
    season,
    team,
    startDate,
    endDate,
  }: TeamGamesQuery): Promise<ScheduledGame[]> {
    const ttl = await this.ttlForSeason(season);

    return this.cache.wrap(
      cacheKey('teamGames', season, team, startDate ?? '', endDate ?? ''),
      ttl,
      async () => {
        const abbreviations = await this.getTeams(season);
        const id = teamId(abbreviations, team);
        if (id === undefined) return [];

        const response = await fetchJson<MlbScheduleResponse>(
          `${MLB_API}/schedule?sportId=${MLB_SPORT_ID}&season=${season}` +
            `&gameType=${MLB_GAME_TYPE}&teamId=${id}` +
            (startDate && endDate
              ? `&startDate=${startDate}&endDate=${endDate}`
              : ''),
        );
        return mapSchedule(response.dates, abbreviations);
      },
    );
  }

  /**
   * The table, straight from upstream — which publishes the clinch and
   * elimination numbers itself, so nothing here is computed. Cached live: a
   * standings page moves once a night in the main, and every few minutes in
   * late September.
   */
  async getStandings(season: string): Promise<StandingsGroup[]> {
    const ttl = await this.ttlForSeason(season);

    return this.cache.wrap(cacheKey('standings', season), ttl, async () => {
      const [response, teams] = await Promise.all([
        fetchJson<MlbStandingsResponse>(
          `${MLB_API}/standings?leagueId=${MLB_LEAGUE_IDS.join(',')}` +
            `&season=${season}&standingsTypes=${MLB_STANDINGS_TYPE}`,
        ),
        this.getTeams(season),
      ]);
      return mapStandings(response.records, teams);
    });
  }

  async getTeamStrength(
    season: string,
    range?: DateRange,
  ): Promise<TeamStrength[]> {
    const ttl = await this.ttlForSeason(season);

    return this.cache.wrap(
      cacheKey(
        'teamStrength',
        season,
        range?.startDate ?? '',
        range?.endDate ?? '',
      ),
      ttl,
      async () => {
        const [hitting, pitching, teams] = await Promise.all([
          this.fetchTeamStats(season, MLB_GROUP_KEYS.hitting, range),
          this.fetchTeamStats(season, MLB_GROUP_KEYS.pitching, range),
          this.getTeams(season),
        ]);
        return mapTeamStrength(hitting, pitching, teams);
      },
    );
  }

  /**
   * The API has no league-wide status feed, so this fans out over the 30 club
   * rosters. It is cached hourly — IL moves are news, not live data.
   */
  async getPlayerStatuses(season: string): Promise<PlayerStatus[]> {
    return this.cache.wrap(
      cacheKey('statuses', season),
      CACHE_TTL.hourly,
      async () => {
        const teams = await this.getTeams(season);
        const rosters = await Promise.all(
          Object.entries(teams).map(async ([id, abbreviation]) => {
            const response = await fetchJsonOrNull<MlbRosterResponse>(
              `${MLB_API}/teams/${id}/roster?rosterType=${MLB_ROSTER_TYPE}&season=${season}`,
            );
            return mapRoster(response?.roster ?? [], abbreviation);
          }),
        );
        return rosters.flat();
      },
    );
  }

  private async fetchTeamStats(
    season: string,
    group: string,
    range?: DateRange,
  ) {
    const type = range ? MLB_STATS_TYPES.byDateRange : MLB_STATS_TYPES.season;
    const { stats } = await fetchJson<MlbStatsResponse<MlbTeamStatSplit>>(
      `${MLB_API}/teams/stats?stats=${type}&group=${group}` +
        `&season=${season}&sportId=${MLB_SPORT_ID}` +
        (range
          ? `&startDate=${range.startDate}&endDate=${range.endDate}`
          : ''),
    );
    return stats[0]?.splits ?? [];
  }

  private async getCurrentSeason() {
    const { seasons } = await this.cache.wrap(
      cacheKey('season'),
      CACHE_TTL.hourly,
      () =>
        fetchJson<MlbSeasonsResponse>(
          `${MLB_API}/seasons/current?sportId=${MLB_SPORT_ID}`,
        ),
    );
    return seasons[0];
  }

  private getTeams(season: string) {
    return this.cache.wrap(
      cacheKey('teams', season),
      CACHE_TTL.daily,
      async () => {
        const { teams } = await fetchJson<MlbTeamsResponse>(
          `${MLB_API}/teams?sportId=${MLB_SPORT_ID}&season=${season}`,
        );
        return Object.fromEntries(
          teams.map(({ id, abbreviation }) => [id, abbreviation]),
        ) as TeamAbbreviations;
      },
    );
  }

  private async ttlForSeason(season: string) {
    const { seasonId } = await this.getCurrentSeason();
    return seasonTtl(season, seasonId);
  }
}

/**
 * A season's outer bounds. Only a defaulted getSchedule call reaches these,
 * and the regular season sits well inside them.
 */
const seasonStart = (season: string) => `${season}-01-01`;
const seasonEnd = (season: string) => `${season}-12-31`;
