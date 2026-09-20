import { Injectable, NotFoundException } from '@nestjs/common';
import { AVAILABILITY } from '../../sports/sports.constants.js';
import { SportsService } from '../../sports/sports.service.js';
import { LOCAL_TOOL_SOURCE } from '../tools.constants.js';
import type { FantasyTool, ToolDefinition } from '../tools.types.js';
import { asLimit, asSport, asString, asStringArray } from '../tools.utils.js';
import {
  AVAILABILITY_PARAM,
  SPORTS_TOOL_MESSAGES,
  SPORT_PARAM,
  STATUS_LIMIT,
  TEAM_PARAM,
} from './sports-tools.constants.js';

const DEFAULT_AVAILABILITY = [AVAILABILITY.injured, AVAILABILITY.inactive];

/**
 * Who is fit to play, so nobody gets recommended off the injured list.
 *
 * Sport-agnostic, though the two sports answer it from different places: a real
 * roster where the league publishes one, the league-wide player directory
 * everywhere else. The service picks, and says which in `source`.
 */
@Injectable()
export class PlayerStatusTool implements FantasyTool {
  readonly definition: ToolDefinition = {
    name: 'get_player_status',
    source: LOCAL_TOOL_SOURCE,
    description:
      'Whether players are fit to play — active, injured (with the league\'s own wording), in the minors, or otherwise out. Check it before recommending anyone to start, add or trade for. Pass a name for one player, or a team for a whole club. Works for every sport.',
    parameters: {
      type: 'object',
      properties: {
        sport: SPORT_PARAM,
        search: {
          type: 'string',
          description:
            'Part of a player name. Omit to list everyone matching the other filters.',
        },
        team: TEAM_PARAM,
        availability: AVAILABILITY_PARAM,
        limit: {
          type: 'integer',
          description: `How many to return (default ${STATUS_LIMIT.default}, max ${STATUS_LIMIT.max}).`,
        },
      },
    },
  };

  constructor(private readonly sports: SportsService) {}

  async execute(args: Record<string, unknown>) {
    const search = asString(args.search)?.trim();
    const requested = asStringArray(args.availability);
    // A name search should say whether that player is healthy, so it must be
    // able to come back "active" — only the unfiltered sweep defaults to unavailable.
    const availability = requested.length
      ? requested
      : search
        ? []
        : DEFAULT_AVAILABILITY;

    const result = await this.sports.getPlayerStatuses(
      asSport(args.sport),
      {
        season: asString(args.season),
        search,
        team: asString(args.team),
        availability,
      },
    );

    if (result.players.length === 0) {
      throw new NotFoundException(SPORTS_TOOL_MESSAGES.noStatuses);
    }

    const limit = asLimit(args.limit, STATUS_LIMIT);

    return {
      ...result,
      total: result.players.length,
      players: result.players.slice(0, limit),
    };
  }
}
