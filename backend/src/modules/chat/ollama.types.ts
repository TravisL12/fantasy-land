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

/** Ollama reports its own timings on the final chunk of a response. */
export interface OllamaTimings {
  /** Nanoseconds spent loading the model's weights; ~0 once it is resident. */
  load_duration?: number;
  /** Prompt tokens actually prefilled — the tokens a warm prefix cache saves. */
  prompt_eval_count?: number;
  prompt_eval_duration?: number;
  total_duration?: number;
}

export interface OllamaChatChunk extends OllamaTimings {
  message?: OllamaMessage;
  done?: boolean;
  error?: string;
}

/** A non-streamed /api/chat response, which is what the warm-up asks for. */
export interface OllamaChatResponse extends OllamaTimings {
  message?: OllamaMessage;
  error?: string;
}

export interface OllamaTagsResponse {
  models: { name: string }[];
}
