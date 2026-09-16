import { Injectable } from '@nestjs/common';
import { StatsQueryDto } from '../../sports/dto/stats-query.dto.js';
import { SportsService } from '../../sports/sports.service.js';
import { SORT_ORDERS } from '../../sports/sports.constants.js';
import { LOCAL_TOOL_SOURCE } from '../tools.constants.js';
import type { FantasyTool, ToolDefinition } from '../tools.types.js';
import { asNumber, asSport, asString, clamp } from '../tools.utils.js';
import {
  LEADERBOARD_LIMIT,
  SCORING_PARAM,
  SEASON_PARAM,
  SPORT_PARAM,
} from './sports-tools.constants.js';

/** Ranked stat lines — "best X by Y" questions. */
@Injectable()
export class LeaderboardTool implements FantasyTool {
  readonly definition: ToolDefinition = {
    name: 'get_leaderboard',
    source: LOCAL_TOOL_SOURCE,
    description:
      'Rank players by fantasy points or any stat, filtered by position, week and stat group. Use this for "best/top players" questions. Call get_sport_catalog first if you need the valid group, position, stat or scoring keys.',
    parameters: {
      type: 'object',
      properties: {
        sport: SPORT_PARAM,
        season: SEASON_PARAM,
        scoring: SCORING_PARAM,
        week: {
          type: 'integer',
          description: 'A single week. Omit for season totals.',
        },
        group: {
          type: 'string',
          description:
            'Stat group key, e.g. "offense" or "kicking" for NFL. Defaults to the first group.',
        },
        position: {
          type: 'string',
          description: 'Filter to one position, e.g. "WR".',
        },
        sort: {
          type: 'string',
          description:
            'What to rank by: "fantasyPoints" (default), "fantasyPointsPerGame", "gamesPlayed", or any stat key such as "rec_yd".',
        },
        order: {
          type: 'string',
          enum: Object.values(SORT_ORDERS),
          description: 'Sort direction. Defaults to desc.',
        },
        minGames: {
          type: 'integer',
          description: 'Ignore players below this many games played.',
        },
        limit: {
          type: 'integer',
          description: `How many players to return (default ${LEADERBOARD_LIMIT.default}, max ${LEADERBOARD_LIMIT.max}).`,
        },
      },
    },
  };

  constructor(private readonly sports: SportsService) {}

  async execute(args: Record<string, unknown>) {
    const sport = asSport(args.sport);
    const result = await this.sports.getStats(
      sport,
      Object.assign(new StatsQueryDto(), {
        season: asString(args.season),
        week: asNumber(args.week),
        group: asString(args.group),
        position: asString(args.position),
        scoring: asString(args.scoring),
        sort: asString(args.sort),
        order: asString(args.order) ?? SORT_ORDERS.desc,
        minGames: asNumber(args.minGames) ?? 0,
        limit: clamp(
          asNumber(args.limit) ?? LEADERBOARD_LIMIT.default,
          1,
          LEADERBOARD_LIMIT.max,
        ),
      }),
    );

    return {
      ...result,
      rows: result.rows.map(
        ({ player, gamesPlayed, fantasyPoints, fantasyPointsPerGame, stats }) => ({
          ...player,
          gamesPlayed,
          fantasyPoints,
          fantasyPointsPerGame,
          stats,
        }),
      ),
    };
  }
}
