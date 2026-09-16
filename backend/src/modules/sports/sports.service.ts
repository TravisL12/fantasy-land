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
import { analyzeForm } from './analysis/form.js';
import { rateMatchups } from './analysis/matchup.js';
import { projectStarts, restPattern } from './analysis/starts.js';
import {
  calculateFantasyPoints,
  perGame,
  sumStats,
  summarizePoints,
} from './scoring/scoring.js';
import {
  COMPUTED_SORT_KEYS,
  FORM_DEFAULTS,
  MATCHUP_SIDES,
  SORT_ORDERS,
  SPORT_PROVIDERS,
  SPORTS_MESSAGES,
  START_CONFIDENCE,
  STARTS_COVERAGE,
  STARTS_COVERAGE_NOTES,
  START_STAT_KEY,
  STARTS_DEFAULTS,
} from './sports.constants.js';
import type {
  FormReport,
  MatchupRating,
  MatchupSide,
  PlayerRef,
  ProbableStarter,
  ProjectedStart,
  ScheduledGame,
  ScoredStatLine,
  SortOrder,
  SportCatalog,
  SportKey,
  SportProvider,
  StartsReport,
  TeamStrength,
} from './sports.types.js';
import { providesLeagueData, resolveDateRange } from './sports.utils.js';

/** A date window, already validated by resolveDateRange. */
export interface DateRangeQuery {
  season?: string;
  startDate?: string;
  endDate?: string;
  days?: number;
}

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

  /** Games in a window, with each announced starter's matchup rated. */
  async getSchedule(sport: SportKey, query: DateRangeQuery) {
    const { games, range, season } = await this.schedule(sport, query);
    const ratings = await this.matchupRatings(
      sport,
      season,
      MATCHUP_SIDES.pitching,
    );

    return {
      sport,
      season,
      ...range,
      games: games.map((game) => ({
        ...game,
        probables: {
          home: withMatchup(game.probables.home, ratings),
          away: withMatchup(game.probables.away, ratings),
        },
      })),
    };
  }

  /**
   * Every announced starter in the window as a flat, matchup-rated list —
   * the "who should I stream tomorrow" view.
   */
  async getProbableStarters(
    sport: SportKey,
    query: DateRangeQuery & { team?: string },
  ) {
    const { games, range, season } = await this.schedule(sport, query);
    const ratings = await this.matchupRatings(
      sport,
      season,
      MATCHUP_SIDES.pitching,
    );
    const team = query.team?.toUpperCase();

    const starters = games
      .flatMap((game) =>
        [game.probables.away, game.probables.home]
          .filter((starter): starter is ProbableStarter => starter !== null)
          .map((starter) => ({
            ...starter,
            date: game.date,
            gameId: game.gameId,
            matchup: ratings.get(starter.opponent) ?? null,
          })),
      )
      .filter((starter) => !team || starter.team === team)
      .sort(
        (a, b) =>
          a.date.localeCompare(b.date) ||
          (b.matchup?.score ?? 0) - (a.matchup?.score ?? 0),
      );

    return { sport, season, ...range, starters };
  }

  /**
   * Starts per pitcher across the window — the two-start question. Announced
   * probables are exact; anything past upstream's ~4-day horizon is projected
   * from the pitcher's rest pattern, so `confidence` is part of every start.
   * Explicit ids get their real rest pattern; the league-wide sweep uses the
   * default, because a game log per pitcher would be dozens of extra fetches.
   */
  async getStarts(
    sport: SportKey,
    query: DateRangeQuery & { playerIds?: string[] },
  ): Promise<{
    sport: SportKey;
    season: string;
    startDate: string;
    endDate: string;
    coverage: string;
    coverageNote: string;
    pitchers: StartsReport[];
  }> {
    const { games, range, season } = await this.schedule(sport, query);
    const ratings = await this.matchupRatings(
      sport,
      season,
      MATCHUP_SIDES.pitching,
    );
    const teamGames = teamSchedules(games);

    const confirmed = new Map<string, { player: PlayerRef; starts: ProjectedStart[] }>();
    for (const game of games) {
      for (const starter of [game.probables.away, game.probables.home]) {
        if (!starter) continue;
        const entry = confirmed.get(starter.playerId) ?? {
          player: {
            id: starter.playerId,
            name: starter.name,
            team: starter.team,
            position: null,
          },
          starts: [],
        };
        entry.starts.push({
          date: game.date,
          opponent: starter.opponent,
          isHome: starter.isHome,
          confidence: START_CONFIDENCE.confirmed,
        });
        confirmed.set(starter.playerId, entry);
      }
    }

    const requested = query.playerIds?.slice(
      0,
      STARTS_DEFAULTS.maxRequestedPlayers,
    );
    const ids = requested?.length
      ? requested
      : [...confirmed.keys()].slice(0, STARTS_DEFAULTS.maxPlayers);

    const pitchers = await Promise.all(
      ids.map((playerId) =>
        this.startsForPitcher({
          sport,
          season,
          playerId,
          confirmed: confirmed.get(playerId),
          teamGames,
          ratings,
          endDate: range.endDate,
          measureRest: Boolean(requested?.length),
        }),
      ),
    );

    const coverage = requested?.length
      ? STARTS_COVERAGE.requested
      : STARTS_COVERAGE.announced;

    return {
      sport,
      season,
      ...range,
      coverage,
      coverageNote: STARTS_COVERAGE_NOTES[coverage],
      pitchers: pitchers
        .filter((report): report is StartsReport => report !== null)
        .sort(
          (a, b) =>
            b.starts.length - a.starts.length ||
            (b.matchupScore ?? 0) - (a.matchupScore ?? 0),
        ),
    };
  }

  /** Every team rated as an opponent, for streaming and sit/start calls. */
  async getMatchupBoard(
    sport: SportKey,
    side: MatchupSide,
    season?: string,
  ) {
    const resolvedSeason = season ?? (await this.getCatalog(sport)).defaultSeason;
    const ratings = await this.matchupRatings(sport, resolvedSeason, side);

    return {
      sport,
      season: resolvedSeason,
      side,
      teams: [...ratings.entries()]
        .map(([team, rating]) => ({ team, ...rating }))
        .sort((a, b) => b.score - a.score),
    };
  }

  async getPlayerStatuses(
    sport: SportKey,
    query: { season?: string; availability?: string[]; team?: string; search?: string },
  ) {
    const provider = this.leagueProvider(sport);
    const season =
      query.season ?? (await provider.getCatalog()).defaultSeason;
    const statuses = await provider.getPlayerStatuses(season);

    const team = query.team?.toUpperCase();
    const search = query.search?.trim().toLowerCase();
    const availability = query.availability?.length
      ? new Set(query.availability)
      : null;

    return {
      sport,
      season,
      players: statuses.filter(
        (player) =>
          (!availability || availability.has(player.availability)) &&
          (!team || player.team === team) &&
          (!search || player.name.toLowerCase().includes(search)),
      ),
    };
  }

  /** Recent games measured against the player's own season baseline. */
  async getPlayerForm(
    sport: SportKey,
    playerId: string,
    query: { season?: string; group?: string; scoring?: string; window?: number },
  ): Promise<{
    sport: SportKey;
    season: string;
    scoring: string;
    player: PlayerRef;
    form: FormReport;
  }> {
    const stats = await this.getPlayerStats(
      sport,
      playerId,
      {
        season: query.season,
        group: query.group,
        scoring: query.scoring,
      } as PlayerStatsQueryDto,
    );
    const catalog = await this.getCatalog(sport);
    const group = resolveGroup(catalog, stats.group);

    return {
      sport: stats.sport,
      season: stats.season,
      scoring: stats.scoring,
      player: stats.player,
      form: analyzeForm(
        stats.entries,
        query.window ?? FORM_DEFAULTS.window,
        group.stats,
      ),
    };
  }

  private async startsForPitcher({
    sport,
    season,
    playerId,
    confirmed,
    teamGames,
    ratings,
    endDate,
    measureRest,
  }: {
    sport: SportKey;
    season: string;
    playerId: string;
    confirmed?: { player: PlayerRef; starts: ProjectedStart[] };
    teamGames: Map<string, Map<string, { opponent: string; isHome: boolean }>>;
    ratings: Map<string, MatchupRating>;
    endDate: string;
    measureRest: boolean;
  }): Promise<StartsReport | null> {
    const log =
      measureRest || !confirmed
        ? await this.provider(sport).getGameLog({ playerId, season })
        : null;
    if (!confirmed && !log) return null;

    const priorStarts = (log?.entries ?? [])
      .filter((entry) => entry.stats[START_STAT_KEY] && entry.date)
      .map((entry) => entry.date as string)
      .sort();

    const player = confirmed?.player ??
      log?.player ?? { id: playerId, name: playerId, team: null, position: null };
    const games = player.team ? teamGames.get(player.team) : undefined;
    if (!games) return null;

    const starts = projectStarts({
      confirmed: confirmed?.starts ?? [],
      teamGames: games,
      lastStart: priorStarts.at(-1) ?? null,
      restDays: measureRest ? restPattern(priorStarts) : undefined,
      endDate,
    }).map((start) => ({
      ...start,
      matchup: ratings.get(start.opponent),
    }));

    const scores = starts
      .map(({ matchup }) => matchup?.score)
      .filter((score): score is number => score !== undefined);

    return {
      player,
      starts,
      confirmedStarts: starts.filter(
        ({ confidence }) => confidence === START_CONFIDENCE.confirmed,
      ).length,
      matchupScore: scores.length
        ? Math.round(
            (scores.reduce((sum, score) => sum + score, 0) / scores.length) * 10,
          ) / 10
        : null,
    };
  }

  private async schedule(sport: SportKey, query: DateRangeQuery) {
    const provider = this.leagueProvider(sport);
    const season = query.season ?? (await provider.getCatalog()).defaultSeason;
    const range = resolveDateRange(query.startDate, query.endDate, query.days);
    const games = await provider.getSchedule({ season, ...range });
    return { games, range, season };
  }

  private async matchupRatings(
    sport: SportKey,
    season: string,
    side: MatchupSide,
  ) {
    const provider = this.leagueProvider(sport);
    const teams: TeamStrength[] = await provider.getTeamStrength(season);
    return rateMatchups(teams, provider.matchupMetrics[side]);
  }

  private leagueProvider(sport: SportKey) {
    const provider = this.provider(sport);
    if (!providesLeagueData(provider)) {
      throw new BadRequestException(SPORTS_MESSAGES.noLeagueData(sport));
    }
    return provider;
  }

  private provider(sport: SportKey) {
    const provider = this.providers.get(sport);
    if (!provider) throw new NotFoundException();
    return provider;
  }
}

const withMatchup = (
  starter: ProbableStarter | null,
  ratings: Map<string, MatchupRating>,
) => (starter ? { ...starter, matchup: ratings.get(starter.opponent) ?? null } : null);

/** Date → opponent for each team, so a projected start can land on a real game. */
const teamSchedules = (games: ScheduledGame[]) => {
  const byTeam = new Map<
    string,
    Map<string, { opponent: string; isHome: boolean }>
  >();
  for (const game of games) {
    for (const [team, opponent, isHome] of [
      [game.home, game.away, true],
      [game.away, game.home, false],
    ] as const) {
      const dates = byTeam.get(team) ?? new Map();
      dates.set(game.date, { opponent, isHome });
      byTeam.set(team, dates);
    }
  }
  return byTeam;
};

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
