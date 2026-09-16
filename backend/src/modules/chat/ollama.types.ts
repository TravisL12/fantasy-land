/** Wire shapes for Ollama's /api/chat and /api/tags endpoints. */

export interface OllamaToolCall {
  /** Some models send `arguments` as a JSON string, not an object. */
  function: { name: string; arguments: Record<string, unknown> | string };
}

export interface OllamaMessage {
  role: string;
  content: string;
  thinking?: string;
  tool_calls?: OllamaToolCall[];
  tool_name?: string;
}

export interface OllamaTool {
  type: 'function';
  function: {
    name: string;
    description: string;
    parameters: Record<string, unknown>;
  };
}

export interface OllamaChatChunk {
  message?: OllamaMessage;
  done?: boolean;
  error?: string;
}

export interface OllamaTagsResponse {
  models: { name: string }[];
}
