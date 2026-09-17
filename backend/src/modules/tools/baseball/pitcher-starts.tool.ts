import { Injectable } from '@nestjs/common';
import { SPORT_KEYS } from '../../sports/sports.constants.js';
import { SportsService } from '../../sports/sports.service.js';
import { LOCAL_TOOL_SOURCE } from '../tools.constants.js';
import type { FantasyTool, ToolDefinition } from '../tools.types.js';
import {
  asLimit,
  asNumber,
  asSport,
  asString,
  asStringArray,
} from '../tools.utils.js';
import {
  BASEBALL_SPORT_PARAM,
  END_DATE_PARAM,
  START_DATE_PARAM,
  STARTS_LIMIT,
} from './baseball-tools.constants.js';

/**
 * The two-start question. Announced probables are exact; the rest is projected
 * from each pitcher's rest pattern, which the result labels per start.
 */
@Injectable()
export class PitcherStartsTool implements FantasyTool {
  readonly definition: ToolDefinition = {
    name: 'get_pitcher_starts',
    source: LOCAL_TOOL_SOURCE,
    description:
      'How many times each starting pitcher is expected to pitch over a date range, with each start rated against the opposing lineup. Use this for two-start week planning and weekly streaming. Every start is marked "confirmed" (announced by the league) or "projected" (inferred from the pitcher\'s rest pattern) — say which when you answer, and never present a projected start as certain. Pass playerIds whenever you know which pitchers matter: without them the result only covers pitchers whose next start is already announced, and the returned coverageNote explains what was missed. ' +
      'Each pitcher carries "starts" (one entry per start, with date, opponent, isHome, confidence and a matchup rating), "confirmedStarts" — how many of them are announced rather than projected — and "matchupScore", the mean 0-100 matchup across the window, which is how to compare two two-start pitchers.',
    parameters: {
      type: 'object',
      properties: {
        sport: BASEBALL_SPORT_PARAM,
        startDate: START_DATE_PARAM,
        endDate: END_DATE_PARAM,
        playerIds: {
          type: 'array',
          items: { type: 'string' },
          description:
            'Specific pitcher ids from find_player. Give these when the question is about named pitchers — they get their real measured rest pattern. Omit to sweep every pitcher with an announced start.',
        },
        minStarts: {
          type: 'integer',
          description:
            'Only return pitchers with at least this many starts in the range. Pass 2 to find two-start pitchers.',
        },
        limit: {
          type: 'integer',
          description: `How many pitchers to return (default ${STARTS_LIMIT.default}, max ${STARTS_LIMIT.max}).`,
        },
      },
    },
  };

  constructor(private readonly sports: SportsService) {}

  async execute(args: Record<string, unknown>) {
    const minStarts = asNumber(args.minStarts) ?? 1;
    const limit = asLimit(args.limit, STARTS_LIMIT);

    const result = await this.sports.getStarts(
      asSport(args.sport, SPORT_KEYS.mlb),
      {
        season: asString(args.season),
        startDate: asString(args.startDate),
        endDate: asString(args.endDate),
        playerIds: asStringArray(args.playerIds),
      },
    );

    const pitchers = result.pitchers.filter(
      ({ starts }) => starts.length >= minStarts,
    );

    return {
      ...result,
      total: pitchers.length,
      pitchers: pitchers.slice(0, limit),
    };
  }
}
