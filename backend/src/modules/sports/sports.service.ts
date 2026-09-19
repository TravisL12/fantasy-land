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
  StartsReport,
  StandingsReport,
  TeamStrength,
} from './sports.types.js';
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
  private async scoreStatLines(
    sport: SportKey,
    query: {
      season?: string;
      week?: number;
      group?: string;
      scoring?: string;
      kind: DataKind;
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
    const lines = await provider.getStatLines({
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
    const { group, scoring, season, rows: scored } = await this.scoreStatLines(
      sport,
      query,
    );

    const search = query.search?.trim().toLowerCase();
    const rows = scored
      .filter(
        ({ player, gamesPlayed }) =>
          (!query.position || player.position === query.position) &&
          gamesPlayed >= query.minGames &&
          (!search || player.name.toLowerCase().includes(search)),
      )
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
    const { group, scoring, season, rows } = await this.scoreStatLines(sport, {
      ...query,
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
      resolveTeam(team, known),
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
