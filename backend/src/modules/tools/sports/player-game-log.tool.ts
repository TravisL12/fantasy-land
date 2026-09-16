import { Injectable } from '@nestjs/common';
import { SportsService } from '../../sports/sports.service.js';
import { LOCAL_TOOL_SOURCE } from '../tools.constants.js';
import type { FantasyTool, ToolDefinition } from '../tools.types.js';
import { asNumber, asSport, asString, clamp, requireString } from '../tools.utils.js';
import {
  GAME_LOG_LIMIT,
  PLAYER_ID_PARAM,
  SCORING_PARAM,
  SEASON_PARAM,
  SPORT_PARAM,
} from './sports-tools.constants.js';

/** Week-by-week scoring — the basis for trend and consistency questions. */
@Injectable()
export class PlayerGameLogTool implements FantasyTool {
  readonly definition: ToolDefinition = {
    name: 'get_player_game_log',
    source: LOCAL_TOOL_SOURCE,
    description:
      "A player's game-by-game fantasy points and stats for a season. Use this for trends, recent form, or boom/bust questions. Pass lastN to keep the result small.",
    parameters: {
      type: 'object',
      properties: {
        sport: SPORT_PARAM,
        playerId: PLAYER_ID_PARAM,
        season: SEASON_PARAM,
        scoring: SCORING_PARAM,
        lastN: {
          type: 'integer',
          description: `Only the most recent N games (max ${GAME_LOG_LIMIT.max}).`,
        },
      },
      required: ['playerId'],
    },
  };

  constructor(private readonly sports: SportsService) {}

  async execute(args: Record<string, unknown>) {
    const { sport, player, season, scoring, group, entries, summary } =
      await this.sports.getPlayerStats(
        asSport(args.sport),
        requireString(args, 'playerId'),
        {
          season: asString(args.season),
          scoring: asString(args.scoring),
        },
      );

    const lastN = asNumber(args.lastN);
    const games = lastN
      ? entries.slice(-clamp(lastN, 1, GAME_LOG_LIMIT.max))
      : entries.slice(-GAME_LOG_LIMIT.max);

    return {
      sport,
      season,
      scoring,
      group,
      player,
      games,
      consistency: summary,
    };
  }
}
