import { BadRequestException, Injectable } from '@nestjs/common';
import { SportsService } from '../../sports/sports.service.js';
import { LOCAL_TOOL_SOURCE } from '../tools.constants.js';
import type { FantasyTool, ToolDefinition } from '../tools.types.js';
import { asSport, asString, asStringArray } from '../tools.utils.js';
import {
  COMPARE_MAX_PLAYERS,
  PLAYER_ID_PARAM,
  SCORING_PARAM,
  SEASON_PARAM,
  SPORTS_TOOL_MESSAGES,
  SPORT_PARAM,
} from './sports-tools.constants.js';

/** Side-by-side on identical scoring, so the numbers are actually comparable. */
@Injectable()
export class ComparePlayersTool implements FantasyTool {
  readonly definition: ToolDefinition = {
    name: 'compare_players',
    source: LOCAL_TOOL_SOURCE,
    description:
      'Compare players head-to-head on the same scoring: season points, points per game, floor, ceiling and volatility. Use this for start/sit and trade questions.',
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

    const sport = asSport(args.sport);
    const query = {
      season: asString(args.season),
      scoring: asString(args.scoring),
    };

    const players = await Promise.all(
      playerIds.map(async (playerId) => {
        const { player, totals, summary, group } =
          await this.sports.getPlayerStats(sport, playerId, query);
        return {
          ...player,
          group,
          games: summary.games,
          fantasyPoints: summary.total,
          pointsPerGame: summary.average,
          median: summary.median,
          floor: summary.floor,
          ceiling: summary.ceiling,
          volatility: summary.stdDev,
          totals,
        };
      }),
    );

    const [best] = [...players].sort(
      (a, b) => b.pointsPerGame - a.pointsPerGame,
    );

    return {
      sport,
      season: query.season,
      scoring: query.scoring,
      players,
      bestPointsPerGame: best.name,
    };
  }
}
