export const API_PREFIX = 'api';
export const APP_CONFIG_KEY = 'app';
export const DEFAULT_PORT = 3000;
export const DEFAULT_CORS_ORIGIN = 'http://localhost:5173';

export const DATABASE_CONFIG_KEY = 'database';
export const DEFAULT_DATABASE_URL =
  'postgres://app:app@localhost:5432/fantasy_land';

export const AUTH_CONFIG_KEY = 'auth';
export const DEFAULT_SESSION_TTL_DAYS = 30;
export const MS_PER_DAY = 24 * 60 * 60 * 1000;

export const CHAT_CONFIG_KEY = 'chat';
/** Ollama runs on the host, not in the compose network. */
export const DEFAULT_OLLAMA_BASE_URL = 'http://host.docker.internal:11434';
export const DEFAULT_OLLAMA_MODEL = 'qwen3.5:9b-q4_K_M';
export const DEFAULT_OLLAMA_TEMPERATURE = 0.3;
/**
 * A ceiling, not an allocation: tokens cost prefill time only once actually
 * used, while too low a value makes Ollama silently drop the oldest messages —
 * the system prompt — partway through a multi-round tool investigation.
 * Ollama's own OLLAMA_CONTEXT_LENGTH caps this; anything above it is clamped.
 */
export const DEFAULT_OLLAMA_NUM_CTX = 65_536;
/** Local models are slow; a long generation shouldn't look like a failure. */
export const DEFAULT_OLLAMA_TIMEOUT_MS = 300_000;
export const DEFAULT_CHAT_MAX_TOOL_ROUNDS = 20;
/**
 * How long Ollama keeps the model resident after a request. Residency is not
 * free — a 9b at q4 with a 64k context holds ~7GB for the whole window, and
 * there is no state where the memory is released but answers stay fast. So
 * this only has to cover *absence*: the chat page pings while it is open, which
 * is what keeps the model hot while someone is actually there. "-1" pins it.
 */
export const DEFAULT_OLLAMA_KEEP_ALIVE = '5m';

/**
 * Where the model warm-up is triggered. "page" loads it when the chat page is
 * opened, so an idle app holds no memory; "boot" also loads it at startup, for
 * a machine with memory to spare; "off" leaves the first question to pay.
 */
export const OLLAMA_WARMUP_MODES = {
  page: 'page',
  boot: 'boot',
  off: 'off',
} as const;
export const DEFAULT_OLLAMA_WARMUP_MODE = OLLAMA_WARMUP_MODES.page;

export const SPORTS_CONFIG_KEY = 'sports';

/**
 * Whether finished seasons are pulled into the cache at startup. "boot" warms
 * them in the background; "off" leaves the first question about an old season
 * to pay for it. Either way the data is identical — this only decides who
 * waits.
 */
export const SPORTS_WARMUP_MODES = { boot: 'boot', off: 'off' } as const;
export const DEFAULT_SPORTS_WARMUP_MODE = SPORTS_WARMUP_MODES.boot;
/**
 * How many seasons back to warm. Past seasons never expire, so this is paid
 * once per deploy of a cache, not per restart.
 */
export const DEFAULT_SPORTS_WARMUP_SEASONS = 10;
/**
 * Pause between one season/group fetch and the next. Warming is background
 * work with nobody waiting on it, and a season of NFL stats is already
 * eighteen weekly requests — pacing keeps a cold cache from arriving at
 * Sleeper as one burst.
 */
export const DEFAULT_SPORTS_WARMUP_DELAY_MS = 250;

export const MCP_CONFIG_KEY = 'mcp';

export const MCP_HTTP_CONFIG_KEY = 'mcpHttp';
