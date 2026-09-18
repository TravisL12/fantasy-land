import { Injectable } from '@nestjs/common';
import { fetchJson } from '../../../../common/http/fetch-json.js';
import { CACHE_TTL } from '../../../data-cache/data-cache.constants.js';
import { DataCacheService } from '../../../data-cache/data-cache.service.js';
import {
  DATA_KINDS,
  SPORT_KEYS,
  SPORTS_CACHE_VERSION,
} from '../../sports.constants.js';
import type {
  GameLog,
  GameLogQuery,
  OpportunityProvider,
  SportCatalog,
  StatLine,
  StatLinesQuery,
} from '../../sports.types.js';
import {
  NFL_CATALOG_BASE,
  NFL_FIRST_SEASON,
  NFL_GROUPS,
  NFL_OPPORTUNITY_STATS,
  NFL_REGULAR_SEASON_WEEKS,
  SLEEPER_API,
  SLEEPER_SEASON_TYPE,
  SLEEPER_STATE_URL,
} from './nfl.constants.js';
import { findGroup, seasonRange } from '../provider.utils.js';
import {
  aggregateStatLines,
  groupForPosition,
  mapStatLines,
  mapWeeklyLog,
  toPlayerRef,
} from './nfl.mapper.js';
import type {
  SleeperPlayerInfo,
  SleeperStatEntry,
  SleeperState,
  SleeperWeeklyLog,
} from './nfl.types.js';

const cacheKey = (...parts: (string | number | undefined)[]) =>
  [
    SPORTS_CACHE_VERSION,
    SPORT_KEYS.nfl,
    ...parts.filter((p) => p !== undefined),
  ].join(':');

@Injectable()
export class NflProvider implements OpportunityProvider {
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

  async getGameLog({
    playerId,
    season,
  }: GameLogQuery): Promise<GameLog | null> {
    const info = await this.cache.wrap(
      cacheKey('player', playerId),
      CACHE_TTL.daily,
      () =>
        fetchJson<SleeperPlayerInfo | null>(
          `${SLEEPER_API}/players/nfl/${encodeURIComponent(playerId)}`,
        ),
    );
    if (!info) return null;

    const player = toPlayerRef(playerId, info);
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

  private getState() {
    return this.cache.wrap(cacheKey('state'), CACHE_TTL.hourly, () =>
      fetchJson<SleeperState>(SLEEPER_STATE_URL),
    );
  }

  private async ttlForSeason(season: string) {
    const state = await this.getState();
    return season === state.season ? CACHE_TTL.live : CACHE_TTL.archived;
  }
}
