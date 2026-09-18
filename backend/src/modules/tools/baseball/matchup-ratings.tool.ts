import { Injectable } from '@nestjs/common';
import {
  MATCHUP_SIDES,
  SPORT_KEYS,
} from '../../sports/sports.constants.js';
import { SportsService } from '../../sports/sports.service.js';
import type { MatchupSide } from '../../sports/sports.types.js';
import { LOCAL_TOOL_SOURCE } from '../tools.constants.js';
import type {
  FantasyTool,
  ToolContext,
  ToolDefinition,
} from '../tools.types.js';
import { asLimit, asSport, asString } from '../tools.utils.js';
import {
  BASEBALL_SPORT_PARAM,
  MATCHUP_SIDE_PARAM,
  MATCHUP_LIMIT,
} from './baseball-tools.constants.js';
import { compactMetrics } from './baseball-tools.utils.js';

/** Which teams are the softest to face — the input to any streaming decision. */
@Injectable()
export class MatchupRatingsTool implements FantasyTool {
  readonly definition: ToolDefinition = {
    name: 'get_matchup_ratings',
    source: LOCAL_TOOL_SOURCE,
    description:
      'Rank every team by how good a matchup they are to face, 0 (brutal) to 100 (great), from their season-to-date production, with the metrics behind each rating. Use it to judge a streamer\'s matchup or to find the lineups to attack.',
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
          description: `How many teams, best matchup first (default all ${MATCHUP_LIMIT.default}).`,
        },
      },
    },
  };

  constructor(private readonly sports: SportsService) {}

  async execute(args: Record<string, unknown>, context?: ToolContext) {
    const side = (asString(args.side) ??
      MATCHUP_SIDES.pitching) as MatchupSide;
    const result = await this.sports.getMatchupBoard(
      asSport(args.sport, SPORT_KEYS.mlb),
      side,
      asString(args.season),
    );

    const limit = asLimit(args.limit, {
      default: result.teams.length,
      max: MATCHUP_LIMIT.max,
    });

    return {
      ...result,
      teams: result.teams
        .slice(0, limit)
        .map(({ team, ...rating }) => ({
          team,
          ...compactMetrics(rating, context?.full),
        })),
    };
  }
}
