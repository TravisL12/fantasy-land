import { Injectable, NotFoundException } from '@nestjs/common';
import { SPORT_KEYS } from '../../sports/sports.constants.js';
import { SportsService } from '../../sports/sports.service.js';
import { LOCAL_TOOL_SOURCE } from '../tools.constants.js';
import type { FantasyTool, ToolDefinition } from '../tools.types.js';
import { asString } from '../tools.utils.js';
import { sleeperGet, type SleeperLeague } from './sleeper.api.js';
import { requireUsername, seasonCandidates } from './sleeper.utils.js';
import { SleeperUserService } from './sleeper.service.js';
import {
  LEAGUE_SEASON_LOOKBACK,
  SLEEPER_SPORT,
  SLEEPER_TOOL_MESSAGES,
  USERNAME_PARAM,
} from './sleeper-tools.constants.js';

/**
 * The whole Sleeper entry point: username in, user_id and league_ids out.
 *
 * It shadows the MCP server's tool of the same name, which defaults the season
 * to a hardcoded past year — so a current-season league list came back empty
 * and the model blamed the username. It also absorbs our own get_user_info,
 * which existed only to turn a username into the user_id this tool now returns
 * anyway; the id chain the system prompt had to spell out is one call. (The
 * MCP server's broken get_user_info is denied in mcp.config.ts, or dropping
 * ours would hand the model that one back.)
 */
@Injectable()
export class SleeperUserLeaguesTool implements FantasyTool {
  readonly definition: ToolDefinition = {
    name: 'get_user_leagues',
    source: LOCAL_TOOL_SOURCE,
    description:
      "Look up a Sleeper account and list its NFL leagues: the user_id and the league_id values every other league tool needs. Start here when the user gives you their Sleeper username. Defaults to the current season.",
    parameters: {
      type: 'object',
      properties: {
        user_id: USERNAME_PARAM,
        season: {
          type: 'string',
          description:
            'Four-digit season. Defaults to the current NFL season — leave it out unless the user asked about a past year.',
        },
      },
      required: ['user_id'],
    },
  };

  constructor(
    private readonly users: SleeperUserService,
    private readonly sports: SportsService,
  ) {}

  async execute(args: Record<string, unknown>) {
    const user = await this.users.find(requireUsername(args));
    const seasons = await this.seasons(asString(args.season)?.trim());

    for (const season of seasons) {
      const leagues =
        (await sleeperGet<SleeperLeague[]>(
          `/user/${user.user_id}/leagues/${SLEEPER_SPORT}/${season}`,
        )) ?? [];

      if (leagues.length > 0) {
        return {
          user: {
            user_id: user.user_id,
            username: user.username,
            display_name: user.display_name,
          },
          season,
          leagues: leagues.map(
            ({ league_id, name, status, total_rosters }) => ({
              league_id,
              name,
              status,
              total_rosters,
            }),
          ),
        };
      }
    }

    throw new NotFoundException(
      SLEEPER_TOOL_MESSAGES.noLeagues(user.username ?? user.user_id, seasons),
    );
  }

  /** An explicit season is taken as asked; otherwise try current, then last. */
  private async seasons(requested?: string): Promise<string[]> {
    if (requested) return [requested];
    const { defaultSeason } = await this.sports.getCatalog(SPORT_KEYS.nfl);
    return seasonCandidates(defaultSeason, LEAGUE_SEASON_LOOKBACK);
  }
}
