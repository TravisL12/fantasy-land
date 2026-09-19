import { Injectable } from '@nestjs/common';
import { SportsService } from '../../sports/sports.service.js';
import { LOCAL_TOOL_SOURCE } from '../tools.constants.js';
import type { FantasyTool, ToolDefinition } from '../tools.types.js';
import { asSport, asString } from '../tools.utils.js';
import { SEASON_PARAM, SPORT_PARAM } from './sports-tools.constants.js';

/** The league table, and where each club stands in the playoff race. */
@Injectable()
export class StandingsTool implements FantasyTool {
  readonly definition: ToolDefinition = {
    name: 'get_standings',
    source: LOCAL_TOOL_SOURCE,
    description:
      'The league table by division: record, games back, points or runs for and against, streak, playoff seed, and whether each club has clinched or been eliminated. Carries a magic number (wins plus rival losses still needed to win the division) and an elimination number. Use it for "who leads the NFC East", "are the Mets still alive", "what do they need to clinch". Every result says in "method" where the clinch numbers came from — pass that on rather than presenting a computed one as the league\'s own.',
    parameters: {
      type: 'object',
      properties: {
        sport: SPORT_PARAM,
        season: SEASON_PARAM,
        group: {
          type: 'string',
          description:
            'One division or conference, e.g. "AFC East", "NFC" or "AL East". Omit for the whole league.',
        },
      },
    },
  };

  constructor(private readonly sports: SportsService) {}

  execute(args: Record<string, unknown>) {
    return this.sports.getStandings(asSport(args.sport), {
      season: asString(args.season),
      group: asString(args.group),
    });
  }
}
