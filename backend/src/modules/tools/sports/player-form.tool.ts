import { Injectable } from '@nestjs/common';
import { FORM_DEFAULTS } from '../../sports/sports.constants.js';
import { SportsService } from '../../sports/sports.service.js';
import { LOCAL_TOOL_SOURCE } from '../tools.constants.js';
import type { FantasyTool, ToolDefinition } from '../tools.types.js';
import { asLimit, asSport, asString, requireString } from '../tools.utils.js';
import {
  PLAYER_ID_PARAM,
  SCORING_PARAM,
  SEASON_PARAM,
  SPORT_PARAM,
} from './sports-tools.constants.js';

/** Recent games against the player's own season baseline — hot or cold, not just good. */
@Injectable()
export class PlayerFormTool implements FantasyTool {
  readonly definition: ToolDefinition = {
    name: 'get_player_form',
    source: LOCAL_TOOL_SOURCE,
    description:
      'Compare a player\'s last N games with their season as a whole, returning both splits, the points-per-game difference and a hot/cold/steady trend. Use this for "is X heating up", slump questions, and buy-low or sell-high calls. Call find_player first to get the id.',
    parameters: {
      type: 'object',
      properties: {
        sport: SPORT_PARAM,
        playerId: PLAYER_ID_PARAM,
        season: SEASON_PARAM,
        scoring: SCORING_PARAM,
        window: {
          type: 'integer',
          description: `How many recent games count as "recent" (default ${FORM_DEFAULTS.window}, min ${FORM_DEFAULTS.minWindow}, max ${FORM_DEFAULTS.maxWindow}).`,
        },
        group: {
          type: 'string',
          description:
            'Stat group key, e.g. "hitting" or "pitching" for MLB. Defaults to the player\'s own group.',
        },
      },
      required: ['playerId'],
    },
  };

  constructor(private readonly sports: SportsService) {}

  async execute(args: Record<string, unknown>) {
    return this.sports.getPlayerForm(
      asSport(args.sport),
      requireString(args, 'playerId'),
      {
        season: asString(args.season),
        group: asString(args.group),
        scoring: asString(args.scoring),
        window: asLimit(
          args.window,
          { default: FORM_DEFAULTS.window, max: FORM_DEFAULTS.maxWindow },
          FORM_DEFAULTS.minWindow,
        ),
      },
    );
  }
}
