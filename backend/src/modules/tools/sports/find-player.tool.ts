import { Injectable, NotFoundException } from '@nestjs/common';
import { StatsQueryDto } from '../../sports/dto/stats-query.dto.js';
import { SportsService } from '../../sports/sports.service.js';
import { LOCAL_TOOL_SOURCE } from '../tools.constants.js';
import type { FantasyTool, ToolDefinition } from '../tools.types.js';
import { asNumber, asSport, clamp, requireString } from '../tools.utils.js';
import {
  FIND_PLAYER_LIMIT,
  SEASON_PARAM,
  SPORT_PARAM,
  SPORTS_TOOL_MESSAGES,
} from './sports-tools.constants.js';

/** Name → id, so every other stats tool has something to work with. */
@Injectable()
export class FindPlayerTool implements FantasyTool {
  readonly definition: ToolDefinition = {
    name: 'find_player',
    source: LOCAL_TOOL_SOURCE,
    description:
      'Find players by name and return their id, team and position. Use this first to turn a player name into a player id.',
    parameters: {
      type: 'object',
      properties: {
        sport: SPORT_PARAM,
        query: {
          type: 'string',
          description: 'Part of the player\'s name, e.g. "Vele".',
        },
        season: SEASON_PARAM,
        limit: {
          type: 'integer',
          description: `Max results (default ${FIND_PLAYER_LIMIT.default}).`,
        },
      },
      required: ['query'],
    },
  };

  constructor(private readonly sports: SportsService) {}

  async execute(args: Record<string, unknown>) {
    const query = requireString(args, 'query');
    const sport = asSport(args.sport);
    const limit = clamp(
      asNumber(args.limit) ?? FIND_PLAYER_LIMIT.default,
      1,
      FIND_PLAYER_LIMIT.max,
    );

    const { season, rows } = await this.sports.getStats(
      sport,
      Object.assign(new StatsQueryDto(), {
        season: args.season ? String(args.season) : undefined,
        search: query,
        limit,
      }),
    );

    if (rows.length === 0) {
      throw new NotFoundException(SPORTS_TOOL_MESSAGES.noMatches(query));
    }

    return {
      sport,
      season,
      players: rows.map(({ player, gamesPlayed }) => ({
        ...player,
        gamesPlayed,
      })),
    };
  }
}
