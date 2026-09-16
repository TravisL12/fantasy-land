import { Injectable } from '@nestjs/common';
import {
  MATCHUP_SIDES,
  SPORT_KEYS,
} from '../../sports/sports.constants.js';
import { SportsService } from '../../sports/sports.service.js';
import type { MatchupSide } from '../../sports/sports.types.js';
import { LOCAL_TOOL_SOURCE } from '../tools.constants.js';
import type { FantasyTool, ToolDefinition } from '../tools.types.js';
import { asNumber, asSport, asString, clamp } from '../tools.utils.js';
import {
  BASEBALL_SPORT_PARAM,
  MATCHUP_SIDE_PARAM,
  PROBABLES_LIMIT,
} from './baseball-tools.constants.js';

/** Which teams are the softest to face — the input to any streaming decision. */
@Injectable()
export class MatchupRatingsTool implements FantasyTool {
  readonly definition: ToolDefinition = {
    name: 'get_matchup_ratings',
    source: LOCAL_TOOL_SOURCE,
    description:
      'Rank every team by how good a matchup they are to face, from 0 (brutal) to 100 (great), based on their season-to-date production. Use this to judge whether a streamer has a soft matchup, or to find which lineups to attack. Ask for side "pitching" when the player facing them is a pitcher, "hitting" when they are a batter.',
    parameters: {
      type: 'object',
      properties: {
        sport: BASEBALL_SPORT_PARAM,
        side: MATCHUP_SIDE_PARAM,
        season: {
          type: 'string',
          description: 'Four-digit season. Defaults to the current season.',
        },
        limit: {
          type: 'integer',
          description: `How many teams to return, best matchup first (default all 30, max ${PROBABLES_LIMIT.max}).`,
        },
      },
    },
  };

  constructor(private readonly sports: SportsService) {}

  async execute(args: Record<string, unknown>) {
    const side = (asString(args.side) ??
      MATCHUP_SIDES.pitching) as MatchupSide;
    const result = await this.sports.getMatchupBoard(
      asSport(args.sport ?? SPORT_KEYS.mlb),
      side,
      asString(args.season),
    );

    const limit = clamp(
      asNumber(args.limit) ?? result.teams.length,
      1,
      PROBABLES_LIMIT.max,
    );

    return { ...result, teams: result.teams.slice(0, limit) };
  }
}
