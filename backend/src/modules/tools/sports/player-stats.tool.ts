import { BadRequestException, Injectable } from '@nestjs/common';
import { analyzeForm } from '../../sports/analysis/form.js';
import { SportsService } from '../../sports/sports.service.js';
import {
  FORM_DEFAULTS,
  PLAYER_SEASONS_LIMIT,
} from '../../sports/sports.constants.js';
import type {
  PointsSummary,
  ScoredGameLogEntry,
  SportKey,
  StatGroup,
} from '../../sports/sports.types.js';
import { LOCAL_TOOL_SOURCE } from '../tools.constants.js';
import type {
  FantasyTool,
  ToolContext,
  ToolDefinition,
} from '../tools.types.js';
import {
  asLimit,
  asNumber,
  asSport,
  asString,
  asVenue,
  asStringArray,
  pickStats,
  requireString,
  resolveStatKeys,
} from '../tools.utils.js';
import {
  DEFAULT_PLAYER_STATS_SECTIONS,
  FORM_WINDOW_LIMIT,
  GAME_LOG_LIMIT,
  GROUP_PARAM,
  PLAYER_ID_PARAM,
  WINDOW_PARAMS,
  PLAYER_STATS_SECTIONS,
  SCORING_PARAM,
  SEASON_PARAM,
  SPORTS_TOOL_MESSAGES,
  SPORT_PARAM,
  STATS_PARAM,
} from './sports-tools.constants.js';

/**
 * Everything about one player's season, in one tool.
 *
 * This replaces get_player_season_stats, get_player_game_log and
 * get_player_form, which asked the same provider for the same game log and
 * differed only in what they kept. Three near-identical schemas cost the model
 * context on every round and gave it a choice it kept getting wrong — asking
 * for a game log to answer a totals question, and reading a season total to
 * answer a form question. One tool with `include` makes the choice a field.
 */
@Injectable()
export class PlayerStatsTool implements FantasyTool {
  readonly definition: ToolDefinition = {
    name: 'get_player_stats',
    source: LOCAL_TOOL_SOURCE,
    description:
      "One player's season: totals, fantasy points and consistency (floor, ceiling, median, volatility). Add include:[\"games\"] for the game-by-game log behind a trend question, and include:[\"form\"] to measure their recent games against their own season for hot/cold, buy-low and sell-high calls. Pass `seasons` instead of `season` for a year-by-year career view — that is the answer to \"how has he trended\", \"is he declining\" and \"career high\". Pass `venue` or `opponent` for a split: home/away, or how they do against one team. Add include:[\"context\"] for where they rank within their position — use it whenever the question is whether a number is actually good. Call find_player first to get the id.",
    parameters: {
      type: 'object',
      properties: {
        sport: SPORT_PARAM,
        playerId: PLAYER_ID_PARAM,
        season: SEASON_PARAM,
        seasons: {
          type: 'array',
          items: { type: 'string' },
          description: `Several four-digit seasons, e.g. ["2026","2025","2024"], for a year-by-year view newest first (max ${PLAYER_SEASONS_LIMIT.max}). Returns one line per season instead of a game log — "include" and "lastN" do not apply.`,
        },
        scoring: SCORING_PARAM,
        include: {
          type: 'array',
          items: { type: 'string', enum: Object.values(PLAYER_STATS_SECTIONS) },
          description: `What to return, defaulting to ["${PLAYER_STATS_SECTIONS.totals}"]. "${PLAYER_STATS_SECTIONS.totals}" is season totals, fantasy points and consistency. "${PLAYER_STATS_SECTIONS.games}" is the game-by-game log. "${PLAYER_STATS_SECTIONS.form}" measures their recent games against their own season. **"${PLAYER_STATS_SECTIONS.context}" is their rank and percentile within their position — ask for it for "where does he rank", "is that good", "top 10 at his position" and anything else needing a number placed against his peers, rather than fetching a leaderboard and counting.** Ask for extra sections only when the question needs them.`,
        },
        stats: STATS_PARAM,
        replacementRank: {
          type: 'integer',
          description:
            'With "context", the rank that counts as replacement level in the user\'s league, e.g. 24 for the 24th running back in a 12-team league that starts two. Omit unless the league size is known — there is no safe default.',
        },
        venue: WINDOW_PARAMS.venue,
        opponent: WINDOW_PARAMS.opponent,
        lastN: {
          type: 'integer',
          description: `With "games", how many recent games to return (default ${GAME_LOG_LIMIT.default}, max ${GAME_LOG_LIMIT.max}). With "form", how many games count as recent (default ${FORM_WINDOW_LIMIT.default}).`,
        },
        group: GROUP_PARAM,
      },
      required: ['playerId'],
    },
  };

  constructor(private readonly sports: SportsService) {}

  async execute(args: Record<string, unknown>, context?: ToolContext) {
    const sport = asSport(args.sport);
    const playerId = requireString(args, 'playerId');
    const sections = this.sections(args.include);
    const venue = asVenue(args.venue);
    const opponent = asString(args.opponent);
    const query = {
      season: asString(args.season),
      group: asString(args.group),
      scoring: asString(args.scoring),
      // A split narrows totals, consistency and the log alike — see
      // getPlayerStats. lastN stays a presentation cap on the games section.
      ...((venue || opponent) && { window: { venue, opponent } }),
    };

    const seasons = asStringArray(args.seasons);
    if (seasons.length > 0) {
      return this.career(sport, playerId, seasons, query, args, context);
    }

    const { player, season, scoring, group, entries, totals, summary } =
      await this.sports.getPlayerStats(sport, playerId, query);

    // A second read of the same cached pool, and only when asked: it is what
    // turns a total into "good for the position" instead of just a number.
    const positionContext = sections.has(PLAYER_STATS_SECTIONS.context)
      ? await this.sports.getPlayerContext(sport, playerId, {
          season,
          group,
          scoring,
          replacementRank: asNumber(args.replacementRank),
        })
      : null;

    const statGroup = await this.group(sport, group);
    const keys = resolveStatKeys(statGroup, args.stats, { full: context?.full });

    return {
      sport,
      season,
      scoring,
      group,
      player,
      ...(sections.has(PLAYER_STATS_SECTIONS.totals) && {
        totals: pickStats(totals, keys),
        // summary.total and summary.average are these two, so `consistency`
        // below carries only the numbers they do not already say.
        fantasyPoints: summary.total,
        pointsPerGame: summary.average,
        consistency: consistency(summary, context?.full),
      }),
      ...(sections.has(PLAYER_STATS_SECTIONS.games) && {
        // A chart plots the whole trend, so a dashboard gets the full log up
        // to the cap; a chat turn pays per game and gets the recent ones.
        games: entries
          .slice(
            -asLimit(args.lastN, {
              ...GAME_LOG_LIMIT,
              default: context?.full
                ? GAME_LOG_LIMIT.max
                : GAME_LOG_LIMIT.default,
            }),
          )
          .map(({ date, week, opponent, isHome, fantasyPoints, stats }) => ({
            date,
            week,
            opponent,
            isHome,
            fantasyPoints,
            stats: pickStats(stats, keys),
          })),
      }),
      ...(sections.has(PLAYER_STATS_SECTIONS.form) && {
        // The form engine is pure, so it runs on the log already in hand
        // rather than asking the service for the same season a second time.
        form: this.form(entries, statGroup, args, keys),
      }),
      ...(positionContext && { context: positionContext }),
    };
  }

  /**
   * A year-by-year line per season. Deliberately narrower than the single
   * season view: a trajectory is read from totals and points per game, and
   * repeating each season's floor, ceiling and volatility would cost more
   * context than the question it answers.
   */
  private async career(
    sport: SportKey,
    playerId: string,
    seasons: string[],
    query: { group?: string; scoring?: string },
    args: Record<string, unknown>,
    context?: ToolContext,
  ) {
    const result = await this.sports.getPlayerSeasons(
      sport,
      playerId,
      seasons,
      query,
    );
    const statGroup = await this.group(sport, result.group);
    const keys = resolveStatKeys(statGroup, args.stats, { full: context?.full });

    return {
      sport,
      scoring: result.scoring,
      group: result.group,
      player: result.player,
      seasons: result.seasons.map(
        ({ season, gamesPlayed, fantasyPoints, pointsPerGame, totals, summary }) => ({
          season,
          gamesPlayed,
          fantasyPoints,
          pointsPerGame,
          totals: pickStats(totals, keys),
          ...(context?.full && { consistency: summary }),
        }),
      ),
      // Said out loud: a season missing from the table is a season the player
      // has no record in, not one we failed to fetch.
      ...(result.missing.length > 0 && {
        notPlayed: result.missing,
      }),
    };
  }

  private sections(include: unknown): Set<string> {
    const asked = asStringArray(include);
    if (!asked.length) return new Set(DEFAULT_PLAYER_STATS_SECTIONS);

    const valid = Object.values(PLAYER_STATS_SECTIONS);
    for (const section of asked) {
      if (!valid.includes(section as never)) {
        throw new BadRequestException(
          SPORTS_TOOL_MESSAGES.unknownSection(section, valid),
        );
      }
    }
    return new Set(asked);
  }

  /** The player's own group, so the stat filter knows what the defaults are. */
  private async group(
    sport: Parameters<SportsService['getCatalog']>[0],
    groupKey: string,
  ): Promise<StatGroup | undefined> {
    const catalog = await this.sports.getCatalog(sport);
    return catalog.groups.find(({ key }) => key === groupKey);
  }

  /**
   * The splits keep their own `average` — the whole report is the difference
   * between the two, so trimming it the way `totals` does would leave the
   * trend with nothing to stand on.
   */
  private form(
    entries: ScoredGameLogEntry[],
    group: StatGroup | undefined,
    args: Record<string, unknown>,
    keys: Set<string> | undefined,
  ) {
    const form = analyzeForm(
      entries,
      asLimit(args.lastN, FORM_WINDOW_LIMIT, FORM_DEFAULTS.minWindow),
      group?.stats ?? [],
    );

    return { ...form, recentTotals: pickStats(form.recentTotals, keys) };
  }
}

/**
 * The distribution without its two headline numbers. `total` and `average` are
 * already reported as fantasyPoints and pointsPerGame, and repeating a number
 * invites the model to treat the two copies as two different measurements.
 */
const consistency = (summary: PointsSummary, full = false) => {
  if (full) return summary;
  const { total: _total, average: _average, ...rest } = summary;
  return rest;
};
