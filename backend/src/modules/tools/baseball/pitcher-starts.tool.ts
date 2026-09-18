import { Injectable } from '@nestjs/common';
import {
  SPORT_KEYS,
  START_CONFIDENCE,
} from '../../sports/sports.constants.js';
import { SportsService } from '../../sports/sports.service.js';
import type { StartsReport } from '../../sports/sports.types.js';
import { LOCAL_TOOL_SOURCE } from '../tools.constants.js';
import type {
  FantasyTool,
  ToolContext,
  ToolDefinition,
} from '../tools.types.js';
import {
  asFlag,
  asLimit,
  asNumber,
  asSport,
  asString,
  asStringArray,
} from '../tools.utils.js';
import {
  BASEBALL_SPORT_PARAM,
  BASEBALL_TOOL_MESSAGES,
  END_DATE_PARAM,
  STARTS_LIMIT,
  START_DATE_PARAM,
  TEAM_PARAM,
} from './baseball-tools.constants.js';
import { compactMatchup } from './baseball-tools.utils.js';

/**
 * Every "who is pitching, and when" question.
 *
 * This absorbed get_probable_pitchers, which asked the same service for the
 * same window and differed only in keeping the announced starts — that is now
 * `confirmedOnly`. Two tools over one date range made the model pick between
 * them on wording ("tonight" vs "this week") rather than on what it needed.
 */
@Injectable()
export class PitcherStartsTool implements FantasyTool {
  readonly definition: ToolDefinition = {
    name: 'get_pitcher_starts',
    source: LOCAL_TOOL_SOURCE,
    description:
      'Starting pitchers over a date range, grouped by pitcher, each start rated against the lineup it faces. Use it for "who is pitching tonight" (a one-day range, or confirmedOnly), streaming, and two-start weeks (minStarts 2). Each start is "confirmed" (announced by the league) or "projected" (inferred from the pitcher\'s rest pattern) — pass that distinction on and never state a projected start as fact. Pass playerIds when the question names pitchers; without them only pitchers with an announced start are covered, as coverageNote explains. Compare pitchers on matchupScore, the mean 0-100 matchup across the window.',
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
            'Pitcher ids from find_player. Give these when the question names pitchers — they get their real measured rest pattern.',
        },
        team: TEAM_PARAM,
        minStarts: {
          type: 'integer',
          description:
            'Only pitchers with at least this many starts in the range. Pass 2 for two-start pitchers.',
        },
        confirmedOnly: {
          type: 'boolean',
          description:
            'Drop projected starts and keep only what the league has announced (roughly four days out).',
        },
        limit: {
          type: 'integer',
          description: `How many pitchers to return (default ${STARTS_LIMIT.default}, max ${STARTS_LIMIT.max}).`,
        },
      },
    },
  };

  constructor(private readonly sports: SportsService) {}

  async execute(args: Record<string, unknown>, context?: ToolContext) {
    const minStarts = asNumber(args.minStarts) ?? 1;
    const limit = asLimit(args.limit, STARTS_LIMIT);
    const confirmedOnly = asFlag(args.confirmedOnly);
    const team = asString(args.team)?.toUpperCase();

    const result = await this.sports.getStarts(
      asSport(args.sport, SPORT_KEYS.mlb),
      {
        season: asString(args.season),
        startDate: asString(args.startDate),
        endDate: asString(args.endDate),
        playerIds: asStringArray(args.playerIds),
      },
    );

    const pitchers = result.pitchers
      .map((pitcher): StartsReport => {
        if (!confirmedOnly) return pitcher;
        const starts = pitcher.starts.filter(
          ({ confidence }) => confidence === START_CONFIDENCE.confirmed,
        );
        return { ...pitcher, starts, confirmedStarts: starts.length };
      })
      .filter(
        ({ player, starts }) =>
          starts.length >= minStarts && (!team || player.team === team),
      );

    return {
      ...result,
      total: pitchers.length,
      pitchers: pitchers.slice(0, limit).map((pitcher) => ({
        ...pitcher,
        starts: pitcher.starts.map((start) => ({
          ...start,
          matchup: compactMatchup(start.matchup, context?.full),
        })),
      })),
      ...(pitchers.length === 0 &&
        confirmedOnly && { note: BASEBALL_TOOL_MESSAGES.noProbables }),
    };
  }
}
