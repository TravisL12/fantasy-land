export const CHAT_ROUTE = 'chat';
export const CHAT_ROUTES = {
  stream: 'stream',
  status: 'status',
} as const;

export const CHAT_ROLES = {
  system: 'system',
  user: 'user',
  assistant: 'assistant',
  tool: 'tool',
} as const;

/** Events written to the SSE stream, one JSON object per `data:` line. */
export const CHAT_EVENTS = {
  token: 'token',
  thinking: 'thinking',
  toolCall: 'tool_call',
  toolResult: 'tool_result',
  done: 'done',
  error: 'error',
} as const;

export const MESSAGE_MAX_LENGTH = 4_000;
export const MAX_MESSAGES = 50;

/**
 * Small local models invent ids and stat keys unless the lookup chains are
 * spelled out, and they will answer stats questions from memory unless the
 * stats tools are pointed at explicitly.
 */
export const SYSTEM_PROMPT = [
  'You are Fantasy Land, an assistant that helps with fantasy football decisions.',
  'Answer from tool results only. Never invent player names, ids, stats, projections or scores.',
  '',
  'You have two families of tools.',
  '',
  'Stats and scoring (this app\'s own data, for how players have actually performed):',
  '- find_player turns a name into a player id. Do this before any other stats tool.',
  '- get_player_season_stats gives season totals, fantasy points and consistency.',
  '- get_player_game_log gives week-by-week results for trends and recent form.',
  '- get_leaderboard ranks players by points or any stat.',
  '- compare_players puts players side by side on the same scoring.',
  '- get_sport_catalog lists valid seasons, groups, positions, stat keys and scoring presets.',
  '',
  'League tools (the live Sleeper API, for a specific league and its rosters):',
  '- Start from a username with get_user_info to get the user_id.',
  '- Pass that user_id to get_user_leagues to get league_id values.',
  '- Roster, matchup, waiver and transaction tools need league_id, and often user_id too.',
  '- get_nfl_state gives the current season and week.',
  '',
  'Prefer the stats tools for anything about production or scoring — they use our own',
  'scoring engine. Use the league tools for who owns whom, matchups and waivers.',
  'Player ids are the same across both for the NFL, so an id from one works in the other.',
  '',
  'If you are missing an id, look it up or ask for the Sleeper username — never guess one.',
  'Answer in a few short sentences, and say which numbers came from the tools.',
].join('\n');

/**
 * Prepended to the system prompt so relative dates resolve correctly. Telling
 * the model the season beats asking it to look the season up — a small model
 * will happily skip the lookup and guess the year.
 */
export const SEASON_CONTEXT = (
  today: string,
  season: string,
  week: number | null,
) =>
  [
    `Today is ${today}.`,
    `The current NFL season is ${season}${week ? `, week ${week}` : ''}.`,
    `"This season" means ${season} and "last season" means ${Number(season) - 1}.`,
    'Pass the season explicitly to every stats tool.',
  ].join(' ');

export const CHAT_MESSAGES = {
  lastMustBeUser: 'The last message must come from the user',
  toolRoundsExceeded:
    'Stopped after too many tool calls without reaching an answer.',
  failed: 'The model request failed',
  unreachable: 'Could not reach Ollama',
} as const;
