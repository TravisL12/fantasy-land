import { Injectable } from '@nestjs/common';
import {
  fetchJson,
  fetchJsonOrNull,
} from '../../../../common/http/fetch-json.js';
import { CACHE_TTL } from '../../../data-cache/data-cache.constants.js';
import { DataCacheService } from '../../../data-cache/data-cache.service.js';
import { SPORT_KEYS, SPORTS_CACHE_VERSION } from '../../sports.constants.js';
import type {
  GameLog,
  GameLogQuery,
  SportCatalog,
  SportProvider,
  StatLinesQuery,
} from '../../sports.types.js';
import { findGroup, seasonRange } from '../provider.utils.js';
import {
  MLB_API,
  MLB_CATALOG_BASE,
  MLB_FIRST_SEASON,
  MLB_GROUP_KEYS,
  MLB_GROUPS,
  MLB_SPORT_ID,
  MLB_STATS_PAGE_SIZE,
} from './mlb.constants.js';
import {
  groupForPerson,
  mapGameLog,
  mapSeasonSplits,
  pitchingRole,
  type TeamAbbreviations,
  toPlayerRef,
} from './mlb.mapper.js';
import type {
  MlbPeopleResponse,
  MlbSeasonsResponse,
  MlbSeasonSplit,
  MlbStatsResponse,
  MlbTeamsResponse,
} from './mlb.types.js';

const cacheKey = (...parts: (string | number)[]) =>
  [SPORTS_CACHE_VERSION, SPORT_KEYS.mlb, ...parts].join(':');

@Injectable()
export class MlbProvider implements SportProvider {
  readonly key = SPORT_KEYS.mlb;

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
    const statGroup = findGroup(MLB_GROUPS, group);
    const ttl = await this.ttlForSeason(season);

    return this.cache.wrap(cacheKey('stats', season, group), ttl, async () => {
      const [response, teams] = await Promise.all([
        fetchJson<MlbStatsResponse<MlbSeasonSplit>>(
          `${MLB_API}/stats?stats=season&group=${group}&season=${season}` +
            `&sportId=${MLB_SPORT_ID}&playerPool=ALL&limit=${MLB_STATS_PAGE_SIZE}`,
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
    return season === seasonId ? CACHE_TTL.live : CACHE_TTL.archived;
  }
}
