import { Injectable, NotFoundException } from '@nestjs/common';
import { StatsQueryDto } from '../../sports/dto/stats-query.dto.js';
import { SportsService } from '../../sports/sports.service.js';
import { LOCAL_TOOL_SOURCE } from '../tools.constants.js';
import type { FantasyTool, ToolDefinition } from '../tools.types.js';
import { asLimit, asSport, asString, requireString } from '../tools.utils.js';
import {
  FIND_PLAYER_LIMIT,
  SEASON_PARAM,
  SPORT_PARAM,
  SPORTS_TOOL_MESSAGES,
} from './sports-tools.constants.js';

/** Name → id, so every other stats tool has something to work with. */
@Injectable()
export class FindPlayerTool implements FantasyTool {
  readonly definition: ToolDefinition = {
    name: 'find_player',
    source: LOCAL_TOOL_SOURCE,
    description:
      'Find players by name and return their id, team and position. Use this first to turn a name into a player id.',
    parameters: {
      type: 'object',
      properties: {
        sport: SPORT_PARAM,
        query: {
          type: 'string',
          description: 'Part of the player\'s name, e.g. "Vele".',
        },
        season: SEASON_PARAM,
        group: {
          type: 'string',
          description:
            'Restrict the search to one stat group. Omit to search every group, which is usually what you want.',
        },
        limit: {
          type: 'integer',
          description: `Max results (default ${FIND_PLAYER_LIMIT.default}).`,
        },
      },
      required: ['query'],
    },
  };

  constructor(private readonly sports: SportsService) {}

  async execute(args: Record<string, unknown>) {
    const query = requireString(args, 'query');
    const sport = asSport(args.sport);
    const limit = asLimit(args.limit, FIND_PLAYER_LIMIT);

    // Every group has to be searched, or a whole half of a sport is invisible:
    // MLB's first group is hitting, so a pitcher would never be found.
    const requestedGroup = asString(args.group);
    const catalog = await this.sports.getCatalog(sport);
    const groups = requestedGroup
      ? [requestedGroup]
      : catalog.groups.map(({ key }) => key);

    const [results, directory] = await Promise.all([
      Promise.all(
        groups.map((group) =>
          this.sports.getStats(
            sport,
            Object.assign(new StatsQueryDto(), {
              season: args.season ? String(args.season) : undefined,
              search: query,
              group,
              limit,
            }),
          ),
        ),
      ),
      // Whoever has not played yet is invisible to a stat-line search, and
      // "who is the Browns' rookie receiver" is a real question. The directory
      // is one cached daily payload, so asking it costs nothing per search.
      this.sports.searchPlayerDirectory(sport, query, limit),
    ]);

    const seen = new Set<string>();
    const played = results
      .flatMap(({ group, rows }) =>
        rows.map(({ player, gamesPlayed }) => ({
          ...player,
          group,
          gamesPlayed,
        })),
      )
      // A two-way player appears in both groups; the busier line is the useful one.
      .sort((a, b) => b.gamesPlayed - a.gamesPlayed)
      .filter(({ id }) => !seen.has(id) && seen.add(id));

    // Players with stats first: they are what a stats question is usually
    // about. The rest carry their roster status, so the model can say why
    // there are no numbers instead of reporting the player as missing.
    const unplayed = directory
      .filter(({ id }) => !seen.has(id) && seen.add(id))
      .map(({ rank: _rank, ...player }) => ({ ...player, gamesPlayed: 0 }));

    const players = [...played, ...unplayed].slice(0, limit);

    if (players.length === 0) {
      throw new NotFoundException(SPORTS_TOOL_MESSAGES.noMatches(query));
    }

    return { sport, season: results[0].season, players };
  }
}
