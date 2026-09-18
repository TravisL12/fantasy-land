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
export const DEFAULT_CHAT_MAX_TOOL_ROUNDS = 6;
/**
 * How long Ollama keeps the model resident after a request. Its own default is
 * 5 minutes, after which the next question pays the weight load again — and
 * loses the prefix cache holding our system prompt and tool schemas.
 */
export const DEFAULT_OLLAMA_KEEP_ALIVE = '30m';

export const MCP_CONFIG_KEY = 'mcp';

export const MCP_HTTP_CONFIG_KEY = 'mcpHttp';
