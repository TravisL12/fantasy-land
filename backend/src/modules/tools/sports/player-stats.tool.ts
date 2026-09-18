import { BadRequestException, Injectable } from '@nestjs/common';
import { analyzeForm } from '../../sports/analysis/form.js';
import { SportsService } from '../../sports/sports.service.js';
import { FORM_DEFAULTS } from '../../sports/sports.constants.js';
import type {
  PointsSummary,
  ScoredGameLogEntry,
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
  asSport,
  asString,
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
      "One player's season: totals, fantasy points and consistency (floor, ceiling, median, volatility). Add include:[\"games\"] for the game-by-game log behind a trend question, and include:[\"form\"] to measure their recent games against their own season for hot/cold, buy-low and sell-high calls. Call find_player first to get the id.",
    parameters: {
      type: 'object',
      properties: {
        sport: SPORT_PARAM,
        playerId: PLAYER_ID_PARAM,
        season: SEASON_PARAM,
        scoring: SCORING_PARAM,
        include: {
          type: 'array',
          items: { type: 'string', enum: Object.values(PLAYER_STATS_SECTIONS) },
          description: `What to return. Defaults to ["${PLAYER_STATS_SECTIONS.totals}"]. Ask for extra sections only when the question needs them.`,
        },
        stats: STATS_PARAM,
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
    const query = {
      season: asString(args.season),
      group: asString(args.group),
      scoring: asString(args.scoring),
    };

    const { player, season, scoring, group, entries, totals, summary } =
      await this.sports.getPlayerStats(sport, playerId, query);

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
