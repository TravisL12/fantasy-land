import { registerAs } from '@nestjs/config';
import {
  CHAT_CONFIG_KEY,
  DEFAULT_CHAT_MAX_TOOL_ROUNDS,
  DEFAULT_OLLAMA_BASE_URL,
  DEFAULT_OLLAMA_MODEL,
  DEFAULT_OLLAMA_NUM_CTX,
  DEFAULT_OLLAMA_TEMPERATURE,
  DEFAULT_OLLAMA_TIMEOUT_MS,
} from './config.constants.js';

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
}

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
  }),
);
