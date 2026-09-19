import { Injectable } from '@nestjs/common';
import { SportsService } from '../../sports/sports.service.js';
import { LOCAL_TOOL_SOURCE } from '../tools.constants.js';
import type {
  FantasyTool,
  ToolContext,
  ToolDefinition,
} from '../tools.types.js';
import { asLimit, asSport, asString, requireString } from '../tools.utils.js';
import {
  GROUP_PARAM,
  PREVIEW_LEADERS,
  PREVIEW_RECENT_GAMES,
  SCORING_PARAM,
  SEASON_PARAM,
  SPORT_PARAM,
  TEAM_SIDE_PARAMS,
} from './sports-tools.constants.js';

/**
 * Two teams set against one game. This absorbed the old baseball-only
 * compare_teams: the series record it returned is here, and so is everything
 * that made it a preview rather than a history — the fixture itself, how each
 * side has been going, and the players the game turns on.
 */
@Injectable()
export class GamePreviewTool implements FantasyTool {
  readonly definition: ToolDefinition = {
    name: 'get_game_preview',
    source: LOCAL_TOOL_SOURCE,
    description:
      'Preview a game between two teams: the fixture itself (next meeting by default), each side\'s record, recent results, team production and leading fantasy scorers, and the series record between them. Use it for "preview Chiefs vs Bills", "how do these two match up" and "how have the Yankees done against the Red Sox". Pass both dates to measure the two teams over that interval instead of the whole season.',
    parameters: {
      type: 'object',
      properties: {
        sport: SPORT_PARAM,
        ...TEAM_SIDE_PARAMS,
        season: SEASON_PARAM,
        gameId: {
          type: 'string',
          description:
            'Preview a specific meeting from get_schedule instead of the next one.',
        },
        startDate: {
          type: 'string',
          description:
            'Only games on or after this date (YYYY-MM-DD). Leave both out for the whole season.',
        },
        endDate: {
          type: 'string',
          description:
            'Only games on or before this date. Pass both to measure team production over that interval too.',
        },
        group: GROUP_PARAM,
        scoring: SCORING_PARAM,
        leaders: {
          type: 'integer',
          description: `Leading scorers per team (default ${PREVIEW_LEADERS.default}, max ${PREVIEW_LEADERS.max}).`,
        },
        recentGames: {
          type: 'integer',
          description: `Recent results per team (default ${PREVIEW_RECENT_GAMES.default}, max ${PREVIEW_RECENT_GAMES.max}).`,
        },
      },
      required: ['teamA', 'teamB'],
    },
  };

  constructor(private readonly sports: SportsService) {}

  async execute(args: Record<string, unknown>, context?: ToolContext) {
    const preview = await this.sports.getGamePreview(asSport(args.sport), {
      teamA: requireString(args, 'teamA'),
      teamB: requireString(args, 'teamB'),
      season: asString(args.season),
      gameId: asString(args.gameId),
      startDate: asString(args.startDate),
      endDate: asString(args.endDate),
      group: asString(args.group),
      scoring: asString(args.scoring),
      leaders: asLimit(args.leaders, PREVIEW_LEADERS),
      recentGames: asLimit(args.recentGames, PREVIEW_RECENT_GAMES),
    });

    if (context?.full) return preview;

    // A chat turn is answering about a game, not rendering a board: the
    // matchup grade is the useful half of a rating and the per-metric
    // breakdown behind it is the widest thing in the result.
    return {
      ...preview,
      teams: preview.teams.map(({ asOpponent, ...team }) => ({
        ...team,
        ...(asOpponent
          ? {
              asOpponent: Object.fromEntries(
                Object.entries(asOpponent).map(([side, rating]) => [
                  side,
                  rating ? { score: rating.score, grade: rating.grade } : null,
                ]),
              ),
            }
          : {}),
      })),
    };
  }
}
