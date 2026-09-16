export const SLEEPER_API_BASE = 'https://api.sleeper.app/v1';
export const SLEEPER_TIMEOUT_MS = 10_000;
/** Sleeper only carries football. */
export const SLEEPER_SPORT = 'nfl';
/** How many earlier seasons to fall back to when the current one is empty. */
export const LEAGUE_SEASON_LOOKBACK = 1;

export const USERNAME_PARAM = {
  type: 'string',
  description:
    'The Sleeper username (the login name, not the team or display name) or a numeric user id.',
} as const;

export const SLEEPER_TOOL_MESSAGES = {
  unknownUser: (name: string) =>
    `Sleeper has no account called "${name}". Sleeper usernames are the login name, not the team name or display name, and they are not email addresses. Ask the user to check the spelling — do not try other spellings yourself.`,
  requestFailed: (status: number) => `The Sleeper API responded ${status}`,
  noLeagues: (name: string, seasons: string[]) =>
    `${name} has no NFL leagues in ${seasons.join(' or ')} on Sleeper.`,
} as const;
