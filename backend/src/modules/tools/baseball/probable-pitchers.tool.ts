import { Injectable } from '@nestjs/common';
import { SPORT_KEYS } from '../../sports/sports.constants.js';
import { SportsService } from '../../sports/sports.service.js';
import { LOCAL_TOOL_SOURCE } from '../tools.constants.js';
import type { FantasyTool, ToolDefinition } from '../tools.types.js';
import { asLimit, asSport, asString } from '../tools.utils.js';
import {
  BASEBALL_SPORT_PARAM,
  BASEBALL_TOOL_MESSAGES,
  END_DATE_PARAM,
  PROBABLES_LIMIT,
  START_DATE_PARAM,
  TEAM_PARAM,
} from './baseball-tools.constants.js';

/** Who is announced to start, and how hard the lineup they face has been. */
@Injectable()
export class ProbablePitchersTool implements FantasyTool {
  readonly definition: ToolDefinition = {
    name: 'get_probable_pitchers',
    source: LOCAL_TOOL_SOURCE,
    description:
      'List the announced probable starting pitchers over a date range, each rated against the opposing lineup. Use this for "who is pitching tonight", "who should I stream tomorrow" and daily start/sit calls. Only covers starts the league has actually announced, roughly four days ahead.',
    parameters: {
      type: 'object',
      properties: {
        sport: BASEBALL_SPORT_PARAM,
        startDate: START_DATE_PARAM,
        endDate: END_DATE_PARAM,
        team: TEAM_PARAM,
        limit: {
          type: 'integer',
          description: `How many starters to return (default ${PROBABLES_LIMIT.default}, max ${PROBABLES_LIMIT.max}).`,
        },
      },
    },
  };

  constructor(private readonly sports: SportsService) {}

  async execute(args: Record<string, unknown>) {
    const limit = asLimit(args.limit, PROBABLES_LIMIT);

    const result = await this.sports.getProbableStarters(
      asSport(args.sport, SPORT_KEYS.mlb),
      {
        season: asString(args.season),
        startDate: asString(args.startDate),
        endDate: asString(args.endDate),
        team: asString(args.team),
      },
    );

    return {
      ...result,
      total: result.starters.length,
      starters: result.starters.slice(0, limit),
      ...(result.starters.length === 0 && {
        note: BASEBALL_TOOL_MESSAGES.noProbables,
      }),
    };
  }
}
