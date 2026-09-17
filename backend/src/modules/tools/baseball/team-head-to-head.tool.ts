import { Injectable } from '@nestjs/common';
import { SPORT_KEYS } from '../../sports/sports.constants.js';
import { SportsService } from '../../sports/sports.service.js';
import { LOCAL_TOOL_SOURCE } from '../tools.constants.js';
import type { FantasyTool, ToolDefinition } from '../tools.types.js';
import { asSport, asString, requireString } from '../tools.utils.js';
import {
  BASEBALL_SPORT_PARAM,
  SERIES_DATE_PARAMS,
  TEAM_SIDE_PARAMS,
} from './baseball-tools.constants.js';

/** Two teams over a season or part of one: the series record and both profiles. */
@Injectable()
export class TeamHeadToHeadTool implements FantasyTool {
  readonly definition: ToolDefinition = {
    name: 'compare_teams',
    source: LOCAL_TOOL_SOURCE,
    description:
      'Head-to-head between two teams across a season or an interval of it: every game they played each other with the final score and winner, the series record, and each team\'s hitting and pitching over that same window with a matchup grade for facing them. Use this for "how have the Yankees done against the Red Sox", series previews, and judging which lineup or staff has been better lately.',
    parameters: {
      type: 'object',
      properties: {
        sport: BASEBALL_SPORT_PARAM,
        ...TEAM_SIDE_PARAMS,
        season: {
          type: 'string',
          description: 'Four-digit season. Defaults to the current season.',
        },
        ...SERIES_DATE_PARAMS,
      },
      required: ['teamA', 'teamB'],
    },
  };

  constructor(private readonly sports: SportsService) {}

  async execute(args: Record<string, unknown>) {
    return this.sports.getTeamHeadToHead(
      asSport(args.sport, SPORT_KEYS.mlb),
      {
        teamA: requireString(args, 'teamA'),
        teamB: requireString(args, 'teamB'),
        season: asString(args.season),
        startDate: asString(args.startDate),
        endDate: asString(args.endDate),
      },
    );
  }
}
