import { Injectable } from '@nestjs/common';
import { SportsService } from '../../sports/sports.service.js';
import { LOCAL_TOOL_SOURCE } from '../tools.constants.js';
import type {
  FantasyTool,
  ToolContext,
  ToolDefinition,
} from '../tools.types.js';
import {
  asLimit,
  asNumberArray,
  asSport,
  asString,
} from '../tools.utils.js';
import {
  SCHEDULE_LIMIT,
  SCHEDULE_WINDOW_PARAMS,
  SEASON_PARAM,
  SPORT_PARAM,
} from './sports-tools.constants.js';

/** The fixture list: what has been played, and what is coming. */
@Injectable()
export class ScheduleTool implements FantasyTool {
  readonly definition: ToolDefinition = {
    name: 'get_schedule',
    source: LOCAL_TOOL_SOURCE,
    description:
      'Games in a window, played and upcoming: the date, the week where the sport has one, both teams, the status and the final score once a game is over. Use it for "who plays this week", "when do the Chiefs next play", "what happened last Sunday" and bye weeks. Ask for NFL by week and MLB by date. A game with no score has not finished yet.',
    parameters: {
      type: 'object',
      properties: {
        sport: SPORT_PARAM,
        season: SEASON_PARAM,
        ...SCHEDULE_WINDOW_PARAMS,
        team: {
          type: 'string',
          description:
            'Only games involving this team abbreviation, e.g. "KC". Omit for the whole slate.',
        },
        limit: {
          type: 'integer',
          description: `How many games to return (default ${SCHEDULE_LIMIT.default}, max ${SCHEDULE_LIMIT.max}).`,
        },
      },
    },
  };

  constructor(private readonly sports: SportsService) {}

  async execute(args: Record<string, unknown>, context?: ToolContext) {
    const team = asString(args.team)?.toUpperCase();
    const { games, ...window } = await this.sports.getSchedule(
      asSport(args.sport),
      {
        season: asString(args.season),
        startDate: asString(args.startDate),
        endDate: asString(args.endDate),
        weeks: asNumberArray(args.weeks),
      },
    );

    const filtered = games.filter(
      (game) => !team || game.home === team || game.away === team,
    );

    return {
      ...window,
      ...(team ? { team } : {}),
      total: filtered.length,
      games: filtered
        .slice(0, asLimit(args.limit, SCHEDULE_LIMIT))
        .map((game) => projectGame(game, context?.full)),
    };
  }
}

/**
 * A chat turn gets the fixture and its result. Probable pitchers ride along
 * only where there are any, and their matchup breakdown only for a caller
 * rendering the whole thing — the per-metric detail is the widest part of a
 * row and get_pitcher_starts is the tool that owns that question anyway.
 */
const projectGame = (
  game: Awaited<ReturnType<SportsService['getSchedule']>>['games'][number],
  full?: boolean,
) => {
  const { probables, ...rest } = game;
  const starters = Object.entries(probables).flatMap(([side, starter]) =>
    starter
      ? [
          [
            side,
            full
              ? starter
              : {
                  playerId: starter.playerId,
                  name: starter.name,
                  matchup: starter.matchup
                    ? {
                        score: starter.matchup.score,
                        grade: starter.matchup.grade,
                      }
                    : null,
                },
          ] as const,
        ]
      : [],
  );

  return starters.length
    ? { ...rest, probables: Object.fromEntries(starters) }
    : rest;
};
