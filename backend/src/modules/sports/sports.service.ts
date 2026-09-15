import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { PlayerStatsQueryDto } from './dto/player-stats-query.dto.js';
import type { StatsQueryDto } from './dto/stats-query.dto.js';
import type {
  PlayerStatsResponseDto,
  StatsResponseDto,
} from './dto/stats-response.dto.js';
import {
  calculateFantasyPoints,
  perGame,
  sumStats,
  summarizePoints,
} from './scoring/scoring.js';
import {
  COMPUTED_SORT_KEYS,
  SORT_ORDERS,
  SPORT_PROVIDERS,
  SPORTS_MESSAGES,
} from './sports.constants.js';
import type {
  ScoredStatLine,
  SortOrder,
  SportCatalog,
  SportKey,
  SportProvider,
} from './sports.types.js';

@Injectable()
export class SportsService {
  private readonly providers: Map<SportKey, SportProvider>;

  constructor(@Inject(SPORT_PROVIDERS) providers: SportProvider[]) {
    this.providers = new Map(providers.map((p) => [p.key, p]));
  }

  getCatalogs(): Promise<SportCatalog[]> {
    return Promise.all([...this.providers.values()].map((p) => p.getCatalog()));
  }

  getCatalog(sport: SportKey): Promise<SportCatalog> {
    return this.provider(sport).getCatalog();
  }

  async getStats(
    sport: SportKey,
    query: StatsQueryDto,
  ): Promise<StatsResponseDto> {
    const provider = this.provider(sport);
    const catalog = await provider.getCatalog();
    const group = resolveGroup(catalog, query.group);
    const scoring = resolveScoring(catalog, query.scoring);

    if (!catalog.dataKinds.includes(query.kind)) {
      throw new BadRequestException(
        SPORTS_MESSAGES.unsupportedKind(query.kind),
      );
    }
    if (query.week !== undefined && !catalog.weeks) {
      throw new BadRequestException(SPORTS_MESSAGES.weeksUnsupported);
    }

    const season = query.season ?? catalog.defaultSeason;
    const lines = await provider.getStatLines({
      season,
      week: query.week,
      group: group.key,
      kind: query.kind,
    });

    const rules = scoring.rules[group.key] ?? {};
    const search = query.search?.trim().toLowerCase();
    const rows = lines
      .filter(
        ({ player, gamesPlayed }) =>
          (!query.position || player.position === query.position) &&
          gamesPlayed >= query.minGames &&
          (!search || player.name.toLowerCase().includes(search)),
      )
      .map((line): ScoredStatLine => {
        const fantasyPoints = calculateFantasyPoints(line.stats, rules);
        return {
          ...line,
          fantasyPoints,
          fantasyPointsPerGame: perGame(fantasyPoints, line.gamesPlayed),
        };
      })
      .sort(
        compareRows(
          query.sort ?? COMPUTED_SORT_KEYS.fantasyPoints,
          query.order,
        ),
      );

    return {
      sport,
      season,
      week: query.week ?? null,
      group: group.key,
      kind: query.kind,
      scoring: scoring.key,
      total: rows.length,
      rows: rows.slice(query.offset, query.offset + query.limit),
    };
  }

  async getPlayerStats(
    sport: SportKey,
    playerId: string,
    query: PlayerStatsQueryDto,
  ): Promise<PlayerStatsResponseDto> {
    const provider = this.provider(sport);
    const catalog = await provider.getCatalog();
    const scoring = resolveScoring(catalog, query.scoring);
    const requestedGroup = query.group
      ? resolveGroup(catalog, query.group).key
      : undefined;
    const season = query.season ?? catalog.defaultSeason;

    const log = await provider.getGameLog({
      playerId,
      season,
      group: requestedGroup,
    });
    if (!log) throw new NotFoundException(SPORTS_MESSAGES.playerNotFound);

    const group = resolveGroup(catalog, log.group);
    const rules = scoring.rules[group.key] ?? {};
    const entries = log.entries.map((entry) => ({
      ...entry,
      fantasyPoints: calculateFantasyPoints(entry.stats, rules),
    }));

    return {
      sport,
      season,
      group: group.key,
      scoring: scoring.key,
      player: log.player,
      entries,
      totals: sumStats(
        entries.map(({ stats }) => stats),
        group.stats,
      ),
      summary: summarizePoints(
        entries.map(({ fantasyPoints }) => fantasyPoints),
      ),
    };
  }

  private provider(sport: SportKey) {
    const provider = this.providers.get(sport);
    if (!provider) throw new NotFoundException();
    return provider;
  }
}

const resolveGroup = (catalog: SportCatalog, key?: string) => {
  const group = key
    ? catalog.groups.find((g) => g.key === key)
    : catalog.groups[0];
  if (!group)
    throw new BadRequestException(SPORTS_MESSAGES.unknownGroup(key ?? ''));
  return group;
};

const resolveScoring = (catalog: SportCatalog, key?: string) => {
  const preset = key
    ? catalog.scoringPresets.find((p) => p.key === key)
    : catalog.scoringPresets[0];
  if (!preset)
    throw new BadRequestException(SPORTS_MESSAGES.unknownScoring(key ?? ''));
  return preset;
};

const sortValue = (
  row: ScoredStatLine,
  key: string,
): number | string | undefined => {
  switch (key) {
    case COMPUTED_SORT_KEYS.name:
      return row.player.name;
    case COMPUTED_SORT_KEYS.fantasyPoints:
    case COMPUTED_SORT_KEYS.fantasyPointsPerGame:
    case COMPUTED_SORT_KEYS.gamesPlayed:
      return row[key];
    default:
      return row.stats[key];
  }
};

/** Missing values always sink to the bottom; ties fall back to name. */
const compareRows =
  (key: string, order: SortOrder) => (a: ScoredStatLine, b: ScoredStatLine) => {
    const av = sortValue(a, key);
    const bv = sortValue(b, key);
    if (av === undefined || bv === undefined) {
      if (av === bv) return a.player.name.localeCompare(b.player.name);
      return av === undefined ? 1 : -1;
    }
    const direction = order === SORT_ORDERS.asc ? 1 : -1;
    const diff =
      typeof av === 'string' || typeof bv === 'string'
        ? String(av).localeCompare(String(bv))
        : av - bv;
    return diff * direction || a.player.name.localeCompare(b.player.name);
  };
