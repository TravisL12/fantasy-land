import { Injectable } from '@nestjs/common';
import { SportsService } from '../../sports/sports.service.js';
import { LOCAL_TOOL_SOURCE } from '../tools.constants.js';
import type { FantasyTool, ToolDefinition } from '../tools.types.js';
import { asSport, asString, requireString } from '../tools.utils.js';
import {
  PLAYER_ID_PARAM,
  SCORING_PARAM,
  SEASON_PARAM,
  SPORT_PARAM,
} from './sports-tools.constants.js';

/** Season totals plus the consistency numbers, without the week-by-week detail. */
@Injectable()
export class PlayerSeasonStatsTool implements FantasyTool {
  readonly definition: ToolDefinition = {
    name: 'get_player_season_stats',
    source: LOCAL_TOOL_SOURCE,
    description:
      "A player's season totals, fantasy points, points per game, and consistency (floor, ceiling, median, volatility). Use this for questions about how a player has performed.",
    parameters: {
      type: 'object',
      properties: {
        sport: SPORT_PARAM,
        playerId: PLAYER_ID_PARAM,
        season: SEASON_PARAM,
        scoring: SCORING_PARAM,
      },
      required: ['playerId'],
    },
  };

  constructor(private readonly sports: SportsService) {}

  async execute(args: Record<string, unknown>) {
    const { sport, player, season, scoring, group, totals, summary } =
      await this.sports.getPlayerStats(
        asSport(args.sport),
        requireString(args, 'playerId'),
        {
          season: asString(args.season),
          scoring: asString(args.scoring),
        },
      );

    // The game log is deliberately dropped here — get_player_game_log returns it.
    return {
      sport,
      season,
      scoring,
      group,
      player,
      totals,
      fantasyPoints: summary.total,
      pointsPerGame: summary.average,
      consistency: summary,
    };
  }
}
