import { Injectable, NotFoundException } from '@nestjs/common';
import {
  AVAILABILITY,
  SPORT_KEYS,
} from '../../sports/sports.constants.js';
import { SportsService } from '../../sports/sports.service.js';
import { LOCAL_TOOL_SOURCE } from '../tools.constants.js';
import type { FantasyTool, ToolDefinition } from '../tools.types.js';
import {
  asNumber,
  asSport,
  asString,
  asStringArray,
  clamp,
} from '../tools.utils.js';
import {
  AVAILABILITY_PARAM,
  BASEBALL_SPORT_PARAM,
  BASEBALL_TOOL_MESSAGES,
  STATUS_LIMIT,
  TEAM_PARAM,
} from './baseball-tools.constants.js';

const DEFAULT_AVAILABILITY = [AVAILABILITY.injured, AVAILABILITY.inactive];

/** Roster availability, so nobody gets recommended off the injured list. */
@Injectable()
export class PlayerStatusTool implements FantasyTool {
  readonly definition: ToolDefinition = {
    name: 'get_player_status',
    source: LOCAL_TOOL_SOURCE,
    description:
      'Look up roster availability — active, injured (with the specific injured-list wording), in the minors, or otherwise unavailable. Use this before recommending anyone to start, add or trade for, and to answer "is X hurt". Pass a name to check one player, or filter by team to see a whole club.',
    parameters: {
      type: 'object',
      properties: {
        sport: BASEBALL_SPORT_PARAM,
        search: {
          type: 'string',
          description:
            'Part of a player name. Omit to list everyone matching the other filters.',
        },
        team: TEAM_PARAM,
        availability: AVAILABILITY_PARAM,
        limit: {
          type: 'integer',
          description: `How many players to return (default ${STATUS_LIMIT.default}, max ${STATUS_LIMIT.max}).`,
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
      asSport(args.sport ?? SPORT_KEYS.mlb),
      {
        season: asString(args.season),
        search,
        team: asString(args.team),
        availability,
      },
    );

    if (result.players.length === 0) {
      throw new NotFoundException(BASEBALL_TOOL_MESSAGES.noStatuses);
    }

    const limit = clamp(
      asNumber(args.limit) ?? STATUS_LIMIT.default,
      1,
      STATUS_LIMIT.max,
    );

    return {
      ...result,
      total: result.players.length,
      players: result.players.slice(0, limit),
    };
  }
}
