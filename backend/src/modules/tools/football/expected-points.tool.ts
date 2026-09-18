import { Injectable } from '@nestjs/common';
import { SPORT_KEYS } from '../../sports/sports.constants.js';
import { SportsService } from '../../sports/sports.service.js';
import type { SortOrder } from '../../sports/sports.types.js';
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
  asStringArray,
} from '../tools.utils.js';
import {
  SCORING_PARAM,
  SEASON_PARAM,
  SPORT_PARAM,
} from '../sports/sports-tools.constants.js';
import {
  EXPECTED_POINTS_LIMIT,
  EXPECTED_POINTS_METHOD,
  EXPECTED_SORT_PARAM,
} from './football-tools.constants.js';

/**
 * Production measured against the opportunity behind it — the "is this real?"
 * question. It defaults to nfl and goes through the provider's opportunity
 * capability, so another sport gets a clear "not wired up" rather than a
 * number built from stats its upstream never published.
 */
@Injectable()
export class ExpectedPointsTool implements FantasyTool {
  readonly definition: ToolDefinition = {
    name: 'get_expected_points',
    source: LOCAL_TOOL_SOURCE,
    description:
      'Expected fantasy points from opportunity, beside what players actually scored. Use for "is he for real / due to regress / getting unlucky" questions, and for usage-based rankings that ignore touchdown luck. NFL only. `delta` is actual minus expected: positive means outscoring the chances, negative means the volume has not paid off yet.',
    parameters: {
      type: 'object',
      properties: {
        sport: SPORT_PARAM,
        season: SEASON_PARAM,
        scoring: SCORING_PARAM,
        week: {
          type: 'integer',
          description: 'A single week. Omit for the season so far.',
        },
        position: {
          type: 'string',
          description: 'Filter to one position, e.g. "WR".',
        },
        playerIds: {
          type: 'array',
          items: { type: 'string' },
          description:
            'Only these players, from find_player. Omit for a league-wide board.',
        },
        minGames: {
          type: 'integer',
          description: 'Ignore players below this many games played.',
        },
        sort: EXPECTED_SORT_PARAM,
        order: {
          type: 'string',
          enum: ['asc', 'desc'],
          description: 'Sort direction. Defaults to desc.',
        },
        limit: {
          type: 'integer',
          description: `How many players to return (default ${EXPECTED_POINTS_LIMIT.default}, max ${EXPECTED_POINTS_LIMIT.max}).`,
        },
      },
    },
  };

  constructor(private readonly sports: SportsService) {}

  async execute(args: Record<string, unknown>, context?: ToolContext) {
    const sport = asSport(args.sport, SPORT_KEYS.nfl);
    const { models, rows, ...result } = await this.sports.getExpectedPoints(
      sport,
      {
        season: asString(args.season),
        week: asNumber(args.week),
        scoring: asString(args.scoring),
        position: asString(args.position)?.toUpperCase(),
        playerIds: asStringArray(args.playerIds),
        minGames: asNumber(args.minGames),
        sort: asString(args.sort),
        order: asString(args.order) as SortOrder | undefined,
        limit: asLimit(args.limit, EXPECTED_POINTS_LIMIT),
      },
    );

    const full = Boolean(context?.full);

    return {
      ...result,
      method: EXPECTED_POINTS_METHOD,
      // How the expectation was priced. A chat turn needs to know the fit
      // exists and how much it explains; only a dashboard renders the weights.
      models: models.map(({ position, observations, rSquared, weights }) => ({
        position,
        observations,
        rSquared,
        ...(full && { weights }),
      })),
      rows: rows.map(({ player, opportunities, ...row }) => ({
        ...player,
        ...row,
        // The counts behind the number are the widest part of a row, and the
        // model can always ask get_leaderboard for the same columns.
        ...(full && { opportunities }),
      })),
    };
  }
}
