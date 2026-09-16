import { Injectable, NotFoundException } from '@nestjs/common';
import { sleeperGet, type SleeperUser } from './sleeper.api.js';
import { SLEEPER_TOOL_MESSAGES } from './sleeper-tools.constants.js';

/** Shared user lookup, so both tools fail the same clear way on a bad name. */
@Injectable()
export class SleeperUserService {
  async find(usernameOrId: string): Promise<SleeperUser> {
    const user = await sleeperGet<SleeperUser>(
      `/user/${encodeURIComponent(usernameOrId)}`,
    );
    if (!user?.user_id) {
      throw new NotFoundException(
        SLEEPER_TOOL_MESSAGES.unknownUser(usernameOrId),
      );
    }
    return user;
  }
}
