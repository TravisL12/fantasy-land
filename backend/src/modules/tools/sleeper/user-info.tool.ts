import { Injectable } from '@nestjs/common';
import { LOCAL_TOOL_SOURCE } from '../tools.constants.js';
import type { FantasyTool, ToolDefinition } from '../tools.types.js';
import { requireUsername } from './sleeper.utils.js';
import { SleeperUserService } from './sleeper.service.js';
import { USERNAME_PARAM } from './sleeper-tools.constants.js';

/**
 * Shadows the MCP server's tool of the same name: that one reads fields off the
 * `null` body Sleeper returns for an unknown user, so a typo surfaced as an
 * opaque TypeError and the model just asked for the username again.
 */
@Injectable()
export class SleeperUserInfoTool implements FantasyTool {
  readonly definition: ToolDefinition = {
    name: 'get_user_info',
    source: LOCAL_TOOL_SOURCE,
    description:
      "Look up a Sleeper account by username and return its user_id. Start here when the user gives you their Sleeper username.",
    parameters: {
      type: 'object',
      properties: { username_or_id: USERNAME_PARAM },
      required: ['username_or_id'],
    },
  };

  constructor(private readonly users: SleeperUserService) {}

  async execute(args: Record<string, unknown>) {
    const { user_id, username, display_name } = await this.users.find(
      requireUsername(args),
    );
    return { user_id, username, display_name };
  }
}
