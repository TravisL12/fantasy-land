import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { mean, round } from '../../common/math/number.js';
import type { PlayerStatsQueryDto } from './dto/player-stats-query.dto.js';
import type { StatsQueryDto } from './dto/stats-query.dto.js';
import type {
  PlayerSeasonsResponseDto,
  PlayerStatsResponseDto,
  StatsResponseDto,
} from './dto/stats-response.dto.js';
import { expectedPoints } from './analysis/expected-points.js';
import { playerHeadToHead, teamSeries } from './analysis/head-to-head.js';
import { clinchNumbers, seasonLength } from './analysis/standings.js';
import {
  recentResults,
  selectPreviewGame,
  sumTeamStats,
  teamLeaders,
  teamRecord,
} from './analysis/preview.js';
import { rateMatchups } from './analysis/matchup.js';
import {
  confirmedStarts,
  projectStarts,
  restPattern,
  teamSchedules,
  type ConfirmedStarts,
  type TeamSchedules,
} from './analysis/starts.js';
import { datesUnusable, sliceGames } from './analysis/window.js';
import { leagueContext } from './analysis/context.js';
import type { LeagueContext } from './analysis/context.js';
import {
  meetsQualifyingLine,
  resolveQualifyingLine,
} from './analysis/qualify.js';
import {
  calculateFantasyPoints,
  perGame,
  sumStats,
  summarizePoints,
} from './scoring/scoring.js';
import {
  COMPUTED_SORT_KEYS,
  DATA_KINDS,
  DIRECTORY_QUERY_DEFAULTS,
  EXPECTED_POINTS_DEFAULTS,
  MATCHUP_SIDES,
  PLAYER_STATUS_SOURCES,
  PREVIEW_DEFAULTS,
  PREVIEW_STATS_SOURCES,
  SORT_ORDERS,
  SPORT_PROVIDERS,
  STANDINGS_METHOD,
  SPORTS_MESSAGES,
  START_CONFIDENCE,
  STARTS_COVERAGE,
  STARTS_COVERAGE_NOTES,
  START_STAT_KEY,
  STARTS_DEFAULTS,
} from './sports.constants.js';
import type {
  DataKind,
  DateRange,
  DirectoryPlayer,
  SportCatalogView,
  ExpectedPointsLine,
  ExpectedPointsModel,
  GamePreview,
  GameWindow,
  MatchupRating,
  MatchupSide,
  PlayerHeadToHead,
  PlayerSplit,
  PreviewTeam,
  ProbableStarter,
  ScoredStatLine,
  SortOrder,
  SportKey,
  SportProvider,
  PlayerStatus,
  PlayerStatusSource,
  StartsReport,
  StandingsReport,
  TeamStrength,
  WindowedStatsQuery,
} from './sports.types.js';
import { STAT_WINDOW_KINDS } from './sports.types.js';
import {
  assertRange,
  capabilitiesOf,
  compareExpected,
  compareRows,
  matchPlayers,
  narrowStandings,
  providesLeagueData,
  providesSchedule,
  providesStandings,
  providesPlayerDirectory,
  providesOpportunityStats,
  providesWindowedStats,
  resolveSeasons,
  statWindowOf,
  resolveDateRange,
  resolveExpectedSort,
  resolveGroup,
  resolveScoring,
  resolveTeam,
} from './sports.utils.js';

/** A date window, already validated by resolveDateRange. */
export interface DateRangeQuery {
  season?: string;
  startDate?: string;
  endDate?: string;
  days?: number;
}

/** A fixture window: a date range, or the weeks a sport that has them uses. */
interface ScheduleWindowQuery extends DateRangeQuery {
  weeks?: number[];
}

/** The window a fixture query resolved to, echoed back with the games. */
interface ScheduleWindow {
  startDate?: string;
  endDate?: string;
  weeks?: number[];
}

@Injectable()
export class SportsService {
  private readonly providers: Map<SportKey, SportProvider>;

  constructor(@Inject(SPORT_PROVIDERS) providers: SportProvider[]) {
    this.providers = new Map(providers.map((p) => [p.key, p]));
  }

  getCatalogs(): Promise<SportCatalogView[]> {
    return Promise.all(
      [...this.providers.values()].map((provider) => this.describe(provider)),
    );
  }

  getCatalog(sport: SportKey): Promise<SportCatalogView> {
    return this.describe(this.provider(sport));
  }

  /**
   * A catalog plus the optional capabilities its provider implements. Clients
   * ask what a sport supports rather than carrying a list of which sports are
   * wired up for what, which goes stale the moment a provider gains a method.
   */
  private async describe(provider: SportProvider): Promise<SportCatalogView> {
    return {
      ...(await provider.getCatalog()),
      capabilities: capabilitiesOf(provider),
    };
  }

  /**
   * Every player's line for one season/week, scored but not yet filtered,
   * sorted or paged. A leaderboard narrows it down; an expected-points fit
   * needs the whole population, since pricing a target off one team's players
   * is not pricing it off the league.
   */
  /**
   * Part of a season for the whole player pool. Both sports serve it, by
   * different means and in different terms, so the capability is checked and
   * the window's shape is checked against what this sport actually measures in
   * — asking baseball for weeks says so rather than quietly returning a season.
   */
  private async windowedLines(
    sport: SportKey,
    provider: SportProvider,
    query: WindowedStatsQuery,
  ) {
    if (!providesWindowedStats(provider)) {
      throw new BadRequestException(SPORTS_MESSAGES.noWindowedStats(sport));
    }

    const asked = query.window.weeks?.length
      ? STAT_WINDOW_KINDS.weeks
      : STAT_WINDOW_KINDS.dates;
    if (!provider.windowKinds.includes(asked)) {
      throw new BadRequestException(
        SPORTS_MESSAGES.windowKindUnsupported(sport, provider.windowKinds),
      );
    }

    return provider.getWindowedStatLines(query);
  }

  private async scoreStatLines(
    sport: SportKey,
    query: {
      season?: string;
      week?: number;
      group?: string;
      scoring?: string;
      kind: DataKind;
      startDate?: string;
      endDate?: string;
      weeks?: number[];
    },
  ) {
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
    const statWindow = statWindowOf(query);
    const lines = statWindow
      ? await this.windowedLines(sport, provider, {
          season,
          group: group.key,
          kind: query.kind,
          window: statWindow,
        })
      : await provider.getStatLines({
          season,
          week: query.week,
          group: group.key,
          kind: query.kind,
        });
    const rules = scoring.rules[group.key] ?? {};

    return {
      catalog,
      group,
      scoring,
      season,
      window: statWindow,
      rows: lines.map((line): ScoredStatLine => {
        const fantasyPoints = calculateFantasyPoints(line.stats, rules);
        return {
          ...line,
          fantasyPoints,
          fantasyPointsPerGame: perGame(fantasyPoints, line.gamesPlayed),
        };
      }),
    };
  }

  async getStats(
    sport: SportKey,
    query: StatsQueryDto,
  ): Promise<StatsResponseDto> {
    const {
      group,
      scoring,
      season,
      window: statWindow,
      rows: scored,
    } = await this.scoreStatLines(sport, query);

    const search = query.search?.trim().toLowerCase();
    const sort = query.sort ?? COMPUTED_SORT_KEYS.fantasyPoints;
    const qualifying = resolveQualifyingLine(group, sort, query, scored);
    const rows = scored
      .filter(
        (row) =>
          (!query.position || row.player.position === query.position) &&
          row.gamesPlayed >= query.minGames &&
          (!search || row.player.name.toLowerCase().includes(search)) &&
          (!qualifying || meetsQualifyingLine(row, qualifying)),
      )
      .sort(compareRows(sort, query.order));

    return {
      sport,
      season,
      week: query.week ?? null,
      window: statWindow ?? null,
      group: group.key,
      kind: query.kind,
      scoring: scoring.key,
      total: rows.length,
      rows: rows.slice(query.offset, query.offset + query.limit),
      // Said out loud, because a reader who is not told a field was narrowed
      // will read it as the whole league.
      ...(qualifying && {
        note: SPORTS_MESSAGES.qualified(
          qualifying.stat,
          qualifying.minimum,
          qualifying.teamGames,
        ),
      }),
    };
  }

  async getPlayerStats(
    sport: SportKey,
    playerId: string,
    query: PlayerStatsQueryDto & { window?: GameWindow },
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
    const scored = log.entries.map((entry) => ({
      ...entry,
      fantasyPoints: calculateFantasyPoints(entry.stats, rules),
    }));
    // The split narrows the whole answer, not only the game list: a home/away
    // question wants home totals and a home floor, not the season's beside a
    // filtered log.
    const entries = query.window ? sliceGames(scored, query.window) : scored;

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

  /**
   * Where a player sits in their position, so a total can be read as good or
   * bad rather than just large.
   *
   * The pool is the same scored stat lines a leaderboard is built from, under
   * the same season, group and scoring preset, so the comparison is drawn in
   * the league the question is about. It is a cached read, not a second
   * upstream call.
   */
  async getPlayerContext(
    sport: SportKey,
    playerId: string,
    query: {
      season?: string;
      group?: string;
      scoring?: string;
      replacementRank?: number;
    },
  ): Promise<LeagueContext | null> {
    const { rows } = await this.scoreStatLines(sport, {
      ...query,
      kind: DATA_KINDS.stats,
    });
    return leagueContext(rows, playerId, {
      replacementRank: query.replacementRank,
    });
  }

  /**
   * One player across several seasons — the trajectory question, and the one
   * the warm-up has already paid for.
   *
   * Each season is the same fetch getPlayerStats makes, and a finished season's
   * cache never expires, so a career view costs one request per season the
   * first time it is asked and none after. A season the player has no log for
   * is reported as missing rather than failing the request: a three-year look
   * at a second-year player should still answer for the two he played.
   */
  async getPlayerSeasons(
    sport: SportKey,
    playerId: string,
    seasons: string[],
    query: PlayerStatsQueryDto,
  ): Promise<PlayerSeasonsResponseDto> {
    const catalog = await this.provider(sport).getCatalog();
    const wanted = resolveSeasons(catalog, seasons);

    const results = await Promise.all(
      wanted.map((season) =>
        this.getPlayerStats(sport, playerId, { ...query, season }).catch(
          (error: unknown) => {
            // Only "this player has no season here" is absorbed. A broken
            // upstream or a bad scoring key should still surface.
            if (error instanceof NotFoundException) return null;
            throw error;
          },
        ),
      ),
    );

    const played = results.filter((result) => result !== null);
    if (played.length === 0) {
      throw new NotFoundException(SPORTS_MESSAGES.playerNotFound);
    }

    // Newest first: a trajectory is read backwards from where the player is now.
    const ordered = [...played].sort((a, b) => b.season.localeCompare(a.season));
    return {
      sport,
      scoring: ordered[0].scoring,
      group: ordered[0].group,
      player: ordered[0].player,
      seasons: ordered.map(({ season, entries, totals, summary }) => ({
        season,
        gamesPlayed: entries.length,
        fantasyPoints: summary.total,
        pointsPerGame: summary.average,
        totals,
        summary,
      })),
      missing: wanted.filter(
        (season) => !played.some((result) => result.season === season),
      ),
    };
  }

  /**
   * Expected fantasy points: what each player's opportunities were worth,
   * beside what they actually scored.
   *
   * The model is fit on the whole league for the same season, week and scoring
   * preset the rows are measured under, so the answer to "is he due to regress"
   * is priced in the league the question is about rather than a stored table
   * of last year's weights. Filters are applied after the fit for that reason.
   */
  async getExpectedPoints(
    sport: SportKey,
    query: {
      season?: string;
      week?: number;
      group?: string;
      scoring?: string;
      position?: string;
      playerIds?: string[];
      minGames?: number;
      sort?: string;
      order?: SortOrder;
      limit?: number;
      offset?: number;
    },
  ): Promise<{
    sport: SportKey;
    season: string;
    week: number | null;
    group: string;
    scoring: string;
    models: ExpectedPointsModel[];
    total: number;
    rows: ExpectedPointsLine[];
  }> {
    const provider = this.provider(sport);
    if (!providesOpportunityStats(provider)) {
      throw new BadRequestException(
        SPORTS_MESSAGES.noOpportunityData(sport),
      );
    }

    const { group, scoring, season, rows: scored } = await this.scoreStatLines(
      sport,
      { ...query, kind: DATA_KINDS.stats },
    );

    const keys = provider.opportunityStats[group.key];
    if (!keys?.length) {
      throw new BadRequestException(
        SPORTS_MESSAGES.noOpportunityGroup(
          group.key,
          Object.keys(provider.opportunityStats),
        ),
      );
    }

    const { models, lines } = expectedPoints(scored, keys);
    const sort = resolveExpectedSort(query.sort);
    const ids = query.playerIds?.length ? new Set(query.playerIds) : null;
    const minGames = query.minGames ?? 0;

    const rows = lines
      .filter(
        ({ player, gamesPlayed }) =>
          (!ids || ids.has(player.id)) &&
          (!query.position || player.position === query.position) &&
          gamesPlayed >= minGames,
      )
      .sort(compareExpected(sort, query.order ?? SORT_ORDERS.desc));

    const offset = query.offset ?? 0;
    const limit = query.limit ?? EXPECTED_POINTS_DEFAULTS.population;

    return {
      sport,
      season,
      week: query.week ?? null,
      group: group.key,
      scoring: scoring.key,
      models,
      total: rows.length,
      rows: rows.slice(offset, offset + limit),
    };
  }

  /**
   * Name search against the league's own player list, which includes players
   * who have not scored a point this season — rookies, the just-signed, the
   * injured. A sport whose provider has no directory returns nothing rather
   * than failing, since the caller has stat-line matches either way.
   */
  async searchPlayerDirectory(
    sport: SportKey,
    query: string,
    limit: number,
  ): Promise<DirectoryPlayer[]> {
    const provider = this.provider(sport);
    if (!providesPlayerDirectory(provider)) return [];

    return matchPlayers(await provider.getPlayerDirectory(), query, limit);
  }

  /**
   * The directory as a browsable, paged list. A search is ranked by how well
   * the name matches; without one the order is upstream's own relevance, so
   * the first page is the players anyone would actually ask about rather than
   * whoever the alphabet puts first.
   */
  async getPlayerDirectory(
    sport: SportKey,
    query: {
      search?: string;
      position?: string;
      team?: string;
      availability?: string[];
      limit?: number;
      offset?: number;
    },
  ): Promise<{
    sport: SportKey;
    total: number;
    players: DirectoryPlayer[];
  }> {
    const provider = this.provider(sport);
    if (!providesPlayerDirectory(provider)) {
      throw new BadRequestException(SPORTS_MESSAGES.noPlayerDirectory(sport));
    }

    const all = await provider.getPlayerDirectory();
    const position = query.position?.toUpperCase();
    const team = query.team?.toUpperCase();
    const availability = query.availability?.length
      ? new Set(query.availability)
      : null;

    const filtered = all.filter(
      (player) =>
        (!position || player.position === position) &&
        (!team || player.team === team) &&
        (!availability || availability.has(player.availability)),
    );

    const search = query.search?.trim();
    const ordered = search
      ? matchPlayers(filtered, search, filtered.length)
      : [...filtered].sort(
          (a, b) =>
            (a.rank ?? Infinity) - (b.rank ?? Infinity) ||
            a.name.localeCompare(b.name),
        );

    const offset = query.offset ?? 0;
    const limit = query.limit ?? DIRECTORY_QUERY_DEFAULTS.limit;

    return {
      sport,
      total: ordered.length,
      players: ordered.slice(offset, offset + limit),
    };
  }

  /**
   * Games in a window, with each announced starter's matchup rated where the
   * sport rates matchups. A fixture list is the narrower capability, so a
   * sport with a schedule and no team stats answers here rather than being
   * turned away for the ratings it was never going to carry.
   */
  async getSchedule(sport: SportKey, query: ScheduleWindowQuery) {
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
    const { games, range, season } = await this.dateSchedule(sport, query);
    const ratings = await this.matchupRatings(
      sport,
      season,
      MATCHUP_SIDES.pitching,
    );
    const teamGames = teamSchedules(games);
    const confirmed = confirmedStarts(games);

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

  /**
   * Who is available to play.
   *
   * Two sources, narrowest first. A league-data provider publishes a real
   * roster — baseball's 40-man, which carries designations a stat feed never
   * shows — and that is preferred wherever it exists. Where it does not, the
   * player directory already carries a normalized `availability` for every
   * player in the league, so football answers from that rather than from
   * nothing. They are different populations, which is why the answer says
   * which one it came from: a 40-man roster is a club's own list, a directory
   * is everyone who exists.
   */
  async getPlayerStatuses(
    sport: SportKey,
    query: { season?: string; availability?: string[]; team?: string; search?: string },
  ) {
    const provider = this.provider(sport);
    const season =
      query.season ?? (await provider.getCatalog()).defaultSeason;
    const { statuses, source } = await this.playerStatuses(
      sport,
      provider,
      season,
    );

    const team = query.team?.toUpperCase();
    const search = query.search?.trim().toLowerCase();
    const availability = query.availability?.length
      ? new Set(query.availability)
      : null;

    return {
      sport,
      season,
      source,
      players: statuses.filter(
        (player) =>
          (!availability || availability.has(player.availability)) &&
          (!team || player.team === team) &&
          (!search || player.name.toLowerCase().includes(search)),
      ),
    };
  }

  private async playerStatuses(
    sport: SportKey,
    provider: SportProvider,
    season: string,
  ): Promise<{ statuses: PlayerStatus[]; source: PlayerStatusSource }> {
    if (providesLeagueData(provider)) {
      return {
        statuses: await provider.getPlayerStatuses(season),
        source: PLAYER_STATUS_SOURCES.roster,
      };
    }

    if (providesPlayerDirectory(provider)) {
      const directory = await provider.getPlayerDirectory();
      return {
        statuses: directory.map(
          ({ id, name, team, position, status, availability }) => ({
            playerId: id,
            name,
            team,
            position,
            // The directory says nothing at all for a player with no note
            // against them, which is itself the answer.
            status: status ?? availability,
            availability,
          }),
        ),
        source: PLAYER_STATUS_SOURCES.directory,
      };
    }

    throw new BadRequestException(SPORTS_MESSAGES.noLeagueData(sport));
  }

  /**
   * Players side by side over a season or any slice of one. The window is a
   * filter on the game log, not a second fetch, so "since the break" or "last
   * 10 games" costs nothing extra. Head-to-head counts only the games every
   * player appeared in, since comparing raw averages rewards whoever played more.
   */
  async comparePlayers(
    sport: SportKey,
    playerIds: string[],
    query: {
      season?: string;
      scoring?: string;
      group?: string;
      window?: GameWindow;
    },
  ) {
    const window = query.window ?? {};
    assertRange(window.startDate, window.endDate);
    const catalog = await this.getCatalog(sport);

    const compared = await Promise.all(
      playerIds.map(async (playerId) => {
        const stats = await this.getPlayerStats(sport, playerId, {
          season: query.season,
          group: query.group,
          scoring: query.scoring,
        } as PlayerStatsQueryDto);
        const group = resolveGroup(catalog, stats.group);
        const entries = sliceGames(stats.entries, window);

        return {
          season: stats.season,
          scoring: stats.scoring,
          datesIgnored: datesUnusable(stats.entries, window),
          entries,
          split: {
            player: stats.player,
            group: group.key,
            summary: summarizePoints(
              entries.map(({ fantasyPoints }) => fantasyPoints),
            ),
            totals: sumStats(
              entries.map(({ stats: values }) => values),
              group.stats,
            ),
          } satisfies PlayerSplit,
        };
      }),
    );

    const players = compared.map(({ split }) => ({
      ...split.player,
      group: split.group,
      games: split.summary.games,
      fantasyPoints: split.summary.total,
      pointsPerGame: split.summary.average,
      median: split.summary.median,
      floor: split.summary.floor,
      ceiling: split.summary.ceiling,
      volatility: split.summary.stdDev,
      totals: split.totals,
    }));

    const [best] = [...players].sort(
      (a, b) => b.pointsPerGame - a.pointsPerGame,
    );
    const headToHead: PlayerHeadToHead = playerHeadToHead(
      compared.map(({ split, entries }) => ({ player: split.player, entries })),
    );

    const notes = [
      compared.some(({ datesIgnored }) => datesIgnored)
        ? SPORTS_MESSAGES.noDatesInLog
        : null,
      players.every(({ games }) => games === 0)
        ? SPORTS_MESSAGES.noGamesInWindow
        : null,
    ].filter((note) => note !== null);

    return {
      sport,
      season: compared[0]?.season ?? catalog.defaultSeason,
      scoring: compared[0]?.scoring ?? catalog.scoringPresets[0]?.key,
      window,
      players,
      bestPointsPerGame: best?.name ?? null,
      headToHead,
      ...(notes.length && { notes }),
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
    confirmed?: ConfirmedStarts;
    teamGames: TeamSchedules;
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
      matchupScore: scores.length ? round(mean(scores), 1) : null,
    };
  }

  /**
   * The league table, division by division. Where upstream publishes the
   * clinch and elimination numbers they are passed through untouched; where it
   * does not they are computed, and `method` says which of the two happened —
   * a magic number a reader assumes is the league's own carries more weight
   * than it has earned.
   */
  async getStandings(
    sport: SportKey,
    query: { season?: string; group?: string } = {},
  ): Promise<StandingsReport> {
    const provider = this.provider(sport);
    if (!providesStandings(provider)) {
      throw new BadRequestException(SPORTS_MESSAGES.noStandings(sport));
    }

    const catalog = await provider.getCatalog();
    const season = query.season ?? catalog.defaultSeason;
    const published = await provider.getStandings(season);
    const gamesInSeason = seasonLength(published);

    const groups = published.map((group) => ({
      ...group,
      teams: clinchNumbers(group.teams, gamesInSeason),
    }));

    return {
      sport,
      season,
      groups: narrowStandings(groups, query.group),
      method: published.some(({ teams }) =>
        teams.some(({ magicNumber }) => magicNumber !== null),
      )
        ? STANDINGS_METHOD.upstream
        : STANDINGS_METHOD.computed,
    };
  }

  /**
   * Two teams set against one game: the fixture, both sides' recent results
   * and production, their leading scorers and the series between them. It is
   * built on the schedule capability alone, so it answers for any sport with
   * a fixture list, and quietly gains the pieces — matchup grades, a probable
   * starter — that only a sport with team stats can supply.
   */
  async getGamePreview(
    sport: SportKey,
    query: {
      teamA: string;
      teamB: string;
      season?: string;
      gameId?: string;
      startDate?: string;
      endDate?: string;
      group?: string;
      scoring?: string;
      leaders?: number;
      recentGames?: number;
    },
  ): Promise<GamePreview> {
    const provider = this.scheduleProvider(sport);
    // Season-long lines on purpose, though the query may carry dates: those
    // narrow the fixtures and the team-strength measurement below. Windowing
    // the player pool as well would make a preview fail outright for a sport
    // that measures part-seasons in weeks, which is most of them.
    const { group, scoring, season, rows } = await this.scoreStatLines(sport, {
      ...query,
      startDate: undefined,
      endDate: undefined,
      kind: DATA_KINDS.stats,
    });

    const notes: string[] = [];
    const range = assertRange(query.startDate, query.endDate);
    // Both ends are needed to measure an interval; one alone only narrows the
    // fixture list, as it does for a head-to-head.
    const interval: DateRange | undefined =
      range.startDate && range.endDate
        ? { startDate: range.startDate, endDate: range.endDate }
        : undefined;

    // A sport with team stats supplies the club line and the matchup grades;
    // one without falls back to its players, and says so.
    const league = providesLeagueData(provider) ? provider : null;
    const strengths = league
      ? await league.getTeamStrength(season, interval)
      : null;
    if (!league) {
      notes.push(SPORTS_MESSAGES.previewFromPlayers(group.label));
    }

    // Club abbreviations come from the team line where there is one, and from
    // the stat lines we already hold otherwise — either way a preview costs no
    // extra request just to learn how this sport spells its teams.
    const known = (
      strengths?.map(({ team }) => team) ??
      rows.flatMap(({ player }) => (player.team ? [player.team] : []))
    )
      .filter((team, index, all) => all.indexOf(team) === index)
      .sort();
    const teams = [query.teamA, query.teamB].map((team) =>
      resolveTeam(team, sport, known),
    ) as [string, string];
    if (teams[0] === teams[1]) {
      throw new BadRequestException(SPORTS_MESSAGES.sameTeam);
    }

    const meetings = await provider.getHeadToHead({ season, teams, ...range });
    const series = teamSeries(meetings, teams);
    const { game, isUpcoming } = selectPreviewGame(series.games, query.gameId);
    // A preview of a game already played is still a preview of something, but
    // the reader has to be told it is looking backwards.
    if (!query.gameId && !isUpcoming) {
      notes.push(SPORTS_MESSAGES.noGamesScheduled(teams));
    }
    if (!game && query.gameId) {
      notes.push(SPORTS_MESSAGES.unknownGame(query.gameId));
    }
    const ratings =
      league && strengths
        ? (Object.fromEntries(
            Object.values(MATCHUP_SIDES).map((side) => [
              side,
              rateMatchups(strengths, league.matchupMetrics[side]),
            ]),
          ) as Record<MatchupSide, Map<string, MatchupRating>>)
        : null;

    const leaderLimit = Math.min(
      query.leaders ?? PREVIEW_DEFAULTS.leaders,
      PREVIEW_DEFAULTS.maxLeaders,
    );
    const gameLimit = Math.min(
      query.recentGames ?? PREVIEW_DEFAULTS.recentGames,
      PREVIEW_DEFAULTS.maxRecentGames,
    );

    const sides = await Promise.all(
      teams.map(async (team): Promise<PreviewTeam> => {
        const played = await provider.getTeamGames({ season, team, ...range });
        const record = teamRecord(played, team);
        const lines = rows.filter(({ player }) => player.team === team);
        const strength = strengths?.find((entry) => entry.team === team);
        const side =
          game && game.home === team
            ? 'home'
            : game && game.away === team
              ? 'away'
              : null;

        return {
          team,
          isHome: side === 'home',
          record,
          recentGames: recentResults(played, gameLimit),
          gamesPlayed:
            strength?.gamesPlayed ??
            record.wins + record.losses + record.ties,
          stats: strength
            ? { hitting: strength.hitting, pitching: strength.pitching }
            : { [group.key]: sumTeamStats(lines, group) },
          statsSource: strength
            ? PREVIEW_STATS_SOURCES.team
            : PREVIEW_STATS_SOURCES.players,
          ...(ratings
            ? {
                asOpponent: Object.fromEntries(
                  Object.values(MATCHUP_SIDES).map((matchupSide) => [
                    matchupSide,
                    ratings[matchupSide].get(team) ?? null,
                  ]),
                ) as Record<MatchupSide, MatchupRating | null>,
              }
            : {}),
          leaders: teamLeaders(lines, group.defaultStats, leaderLimit),
          ...(side
            ? {
                probable:
                  meetings.find(({ gameId }) => gameId === game?.gameId)
                    ?.probables[side] ?? null,
              }
            : {}),
        };
      }),
    );

    return {
      sport,
      season,
      ...range,
      group: group.key,
      scoring: scoring.key,
      game,
      teams: sides as [PreviewTeam, PreviewTeam],
      series,
      notes,
    };
  }

  /**
   * Resolves the window a fixture question is asking about. A sport with weeks
   * can be asked for them directly, because "week 3" is how football is talked
   * about and turning it into dates first would be the caller's guesswork.
   * Everything else falls back to the date range, capped as always.
   */
  private async schedule(sport: SportKey, query: ScheduleWindowQuery) {
    const provider = this.scheduleProvider(sport);
    const catalog = await provider.getCatalog();
    const season = query.season ?? catalog.defaultSeason;
    const weeks = query.weeks?.length ? query.weeks : undefined;

    if (weeks) {
      if (!catalog.weeks) {
        throw new BadRequestException(SPORTS_MESSAGES.weeksNeeded(sport));
      }
      if (query.startDate || query.endDate) {
        throw new BadRequestException(SPORTS_MESSAGES.scheduleNeedsWindow);
      }
      const games = await provider.getSchedule({ season, weeks });
      return { games, range: { weeks } as ScheduleWindow, season };
    }

    const range = resolveDateRange(query.startDate, query.endDate, query.days);
    const games = await provider.getSchedule({ season, ...range });
    return { games, range: range as ScheduleWindow, season };
  }

  /**
   * The same window, guaranteed to be dates. Probable starters and projected
   * starts reason in days of rest and in who is announced to pitch, so they
   * need the full league-data capability rather than the fixtures alone — and
   * a sport without it should hear that, not get an empty list of pitchers.
   */
  private async dateSchedule(sport: SportKey, query: DateRangeQuery) {
    const provider = this.leagueProvider(sport);
    const season = query.season ?? (await provider.getCatalog()).defaultSeason;
    const range = resolveDateRange(query.startDate, query.endDate, query.days);
    const games = await provider.getSchedule({ season, ...range });
    return { games, range, season };
  }

  /**
   * Matchup ratings where the sport has team stats to rate, and an empty map
   * where it does not — a schedule for a sport without them is still a
   * schedule, so this returns nothing rather than throwing.
   */
  private async matchupRatings(
    sport: SportKey,
    season: string,
    side: MatchupSide,
  ) {
    const provider = this.provider(sport);
    if (!providesLeagueData(provider)) {
      return new Map<string, MatchupRating>();
    }
    const teams: TeamStrength[] = await provider.getTeamStrength(season);
    return rateMatchups(teams, provider.matchupMetrics[side]);
  }

  private scheduleProvider(sport: SportKey) {
    const provider = this.provider(sport);
    if (!providesSchedule(provider)) {
      throw new BadRequestException(SPORTS_MESSAGES.noSchedule(sport));
    }
    return provider;
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
