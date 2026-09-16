import { BadRequestException, Injectable } from '@nestjs/common';
import { WINDOW_DEFAULTS } from '../../sports/sports.constants.js';
import { SportsService } from '../../sports/sports.service.js';
import type { GameWindow } from '../../sports/sports.types.js';
import { LOCAL_TOOL_SOURCE } from '../tools.constants.js';
import type { FantasyTool, ToolDefinition } from '../tools.types.js';
import {
  asNumber,
  asNumberArray,
  asSport,
  asString,
  asStringArray,
  clamp,
} from '../tools.utils.js';
import {
  COMPARE_MAX_PLAYERS,
  PLAYER_ID_PARAM,
  SCORING_PARAM,
  SEASON_PARAM,
  SPORTS_TOOL_MESSAGES,
  SPORT_PARAM,
  WINDOW_PARAMS,
} from './sports-tools.constants.js';

/**
 * Side by side on identical scoring, over the whole season or any slice of it,
 * plus a head-to-head over the games they all played.
 */
@Injectable()
export class ComparePlayersTool implements FantasyTool {
  readonly definition: ToolDefinition = {
    name: 'compare_players',
    source: LOCAL_TOOL_SOURCE,
    description:
      'Compare players head-to-head on the same scoring: points, points per game, floor, ceiling and volatility, plus who outscored whom in the games they both played. Covers a whole season by default, or any interval — pass startDate/endDate for a stretch of the calendar, weeks for NFL weeks, or lastN for the most recent games. Use this for start/sit, trade and "who has been better since X" questions.',
    parameters: {
      type: 'object',
      properties: {
        sport: SPORT_PARAM,
        playerIds: {
          type: 'array',
          items: PLAYER_ID_PARAM,
          description: `Two to ${COMPARE_MAX_PLAYERS} player ids from find_player.`,
        },
        season: SEASON_PARAM,
        scoring: SCORING_PARAM,
        ...WINDOW_PARAMS,
      },
      required: ['playerIds'],
    },
  };

  constructor(private readonly sports: SportsService) {}

  async execute(args: Record<string, unknown>) {
    const playerIds = asStringArray(args.playerIds);
    if (playerIds.length < 2) {
      throw new BadRequestException(SPORTS_TOOL_MESSAGES.needTwoPlayers);
    }
    if (playerIds.length > COMPARE_MAX_PLAYERS) {
      throw new BadRequestException(SPORTS_TOOL_MESSAGES.tooManyPlayers);
    }

    const lastN = asNumber(args.lastN);
    const window: GameWindow = {
      startDate: asString(args.startDate),
      endDate: asString(args.endDate),
      weeks: asNumberArray(args.weeks),
      lastN: lastN
        ? clamp(lastN, WINDOW_DEFAULTS.minLastN, WINDOW_DEFAULTS.maxLastN)
        : undefined,
    };

    return this.sports.comparePlayers(asSport(args.sport), playerIds, {
      season: asString(args.season),
      scoring: asString(args.scoring),
      window,
    });
  }
}
