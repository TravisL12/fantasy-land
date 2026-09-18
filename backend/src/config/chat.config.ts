import { registerAs } from '@nestjs/config';
import {
  CHAT_CONFIG_KEY,
  DEFAULT_CHAT_MAX_TOOL_ROUNDS,
  DEFAULT_OLLAMA_BASE_URL,
  DEFAULT_OLLAMA_KEEP_ALIVE,
  DEFAULT_OLLAMA_MODEL,
  DEFAULT_OLLAMA_NUM_CTX,
  DEFAULT_OLLAMA_TEMPERATURE,
  DEFAULT_OLLAMA_TIMEOUT_MS,
  DEFAULT_OLLAMA_WARMUP_MODE,
  OLLAMA_WARMUP_MODES,
} from './config.constants.js';

export type OllamaWarmupMode =
  (typeof OLLAMA_WARMUP_MODES)[keyof typeof OLLAMA_WARMUP_MODES];

export interface ChatConfig {
  baseUrl: string;
  model: string;
  temperature: number;
  /** Context window sent to Ollama; past this it drops the oldest messages. */
  contextTokens: number;
  timeoutMs: number;
  /** How many assistant→tool→assistant turns one request may take. */
  maxToolRounds: number;
  /** Let reasoning models emit a thinking block (streamed separately). */
  think: boolean;
  /** How long Ollama holds the model in memory after a request ("30m", "-1"). */
  keepAlive: string;
  /** When to load the model and prefill the prompt: page open, boot, or never. */
  warmup: OllamaWarmupMode;
}

/** An unrecognised value falls back rather than failing boot over a typo. */
const warmupMode = (value: string | undefined): OllamaWarmupMode =>
  value && value in OLLAMA_WARMUP_MODES
    ? OLLAMA_WARMUP_MODES[value as OllamaWarmupMode]
    : DEFAULT_OLLAMA_WARMUP_MODE;

const number = (value: string | undefined, fallback: number) => {
  const parsed = Number(value);
  return value !== undefined && Number.isFinite(parsed) ? parsed : fallback;
};

export const chatConfig = registerAs(
  CHAT_CONFIG_KEY,
  (): ChatConfig => ({
    baseUrl: process.env.OLLAMA_BASE_URL ?? DEFAULT_OLLAMA_BASE_URL,
    model: process.env.OLLAMA_MODEL ?? DEFAULT_OLLAMA_MODEL,
    temperature: number(
      process.env.OLLAMA_TEMPERATURE,
      DEFAULT_OLLAMA_TEMPERATURE,
    ),
    contextTokens: number(process.env.OLLAMA_NUM_CTX, DEFAULT_OLLAMA_NUM_CTX),
    timeoutMs: number(process.env.OLLAMA_TIMEOUT_MS, DEFAULT_OLLAMA_TIMEOUT_MS),
    maxToolRounds: number(
      process.env.CHAT_MAX_TOOL_ROUNDS,
      DEFAULT_CHAT_MAX_TOOL_ROUNDS,
    ),
    think: process.env.OLLAMA_THINK === 'true',
    keepAlive: process.env.OLLAMA_KEEP_ALIVE ?? DEFAULT_OLLAMA_KEEP_ALIVE,
    warmup: warmupMode(process.env.OLLAMA_WARMUP),
  }),
);
