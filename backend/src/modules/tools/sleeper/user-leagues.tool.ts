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
 * Shadows the MCP server's tool of the same name, which defaults the season to
 * a hardcoded past year — so a current-season league list came back empty and
 * the model blamed the username. This one defaults to the live NFL season, take
 * a username as well as a user id, and falls back one season before giving up.
 */
@Injectable()
export class SleeperUserLeaguesTool implements FantasyTool {
  readonly definition: ToolDefinition = {
    name: 'get_user_leagues',
    source: LOCAL_TOOL_SOURCE,
    description:
      "List a Sleeper user's NFL leagues, with the league_id the other league tools need. Takes a username or a user_id, and defaults to the current season.",
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
          user: { user_id: user.user_id, username: user.username },
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
