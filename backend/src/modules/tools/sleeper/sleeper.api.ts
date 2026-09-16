import { ServiceUnavailableException } from '@nestjs/common';
import {
  SLEEPER_API_BASE,
  SLEEPER_TIMEOUT_MS,
  SLEEPER_TOOL_MESSAGES,
} from './sleeper-tools.constants.js';

/**
 * Sleeper answers an unknown user with 200 and a `null` body rather than a 404,
 * so callers get `null` here and decide what that means.
 */
export const sleeperGet = async <T>(path: string): Promise<T | null> => {
  const response = await fetch(`${SLEEPER_API_BASE}${path}`, {
    signal: AbortSignal.timeout(SLEEPER_TIMEOUT_MS),
  });
  if (!response.ok) {
    throw new ServiceUnavailableException(
      SLEEPER_TOOL_MESSAGES.requestFailed(response.status),
    );
  }
  return (await response.json()) as T | null;
};

export interface SleeperUser {
  user_id: string;
  username: string | null;
  display_name: string | null;
}

export interface SleeperLeague {
  league_id: string;
  name: string;
  season: string;
  status: string;
  total_rosters: number;
  scoring_settings?: Record<string, number>;
}
