import { BadRequestException, Injectable } from '@nestjs/common';
import { WINDOW_DEFAULTS } from '../../sports/sports.constants.js';
import { SportsService } from '../../sports/sports.service.js';
import type { GameWindow, StatValues } from '../../sports/sports.types.js';
import { LOCAL_TOOL_SOURCE } from '../tools.constants.js';
import type {
  FantasyTool,
  ToolContext,
  ToolDefinition,
} from '../tools.types.js';
import {
  asNumber,
  asNumberArray,
  asSport,
  asString,
  asStringArray,
  clamp,
  pickStats,
  resolveStatKeys,
} from '../tools.utils.js';
import {
  COMPARE_MAX_PLAYERS,
  PLAYER_ID_PARAM,
  SCORING_PARAM,
  SEASON_PARAM,
  SPORTS_TOOL_MESSAGES,
  SPORT_PARAM,
  STATS_PARAM,
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
      'Compare players on the same scoring: points, points per game, floor, ceiling, volatility, and who outscored whom in the games they both played. Covers the season by default, or any interval via startDate/endDate, weeks or lastN. Use this for start/sit, trade and "who has been better since X" questions.',
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
        stats: STATS_PARAM,
        ...WINDOW_PARAMS,
      },
      required: ['playerIds'],
    },
  };

  constructor(private readonly sports: SportsService) {}

  async execute(args: Record<string, unknown>, context?: ToolContext) {
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

    const sport = asSport(args.sport);
    const result = await this.sports.comparePlayers(sport, playerIds, {
      season: asString(args.season),
      scoring: asString(args.scoring),
      window,
    });

    // Each player repeats their whole stat group, so the filter is worth more
    // here than anywhere else: it is the one tool that multiplies a stat line.
    const catalog = await this.sports.getCatalog(sport);
    const group = catalog.groups.find(
      ({ key }) => key === result.players[0]?.group,
    );
    const keys = resolveStatKeys(group, args.stats, { full: context?.full });

    return {
      ...result,
      players: result.players.map(
        (player: { totals: StatValues }) => ({
          ...player,
          totals: pickStats(player.totals, keys),
        }),
      ),
    };
  }
}
