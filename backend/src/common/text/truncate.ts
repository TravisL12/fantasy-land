/**
 * Long tool payloads crowd out the question, but cutting too hard throws away
 * real rows. Sized against DEFAULT_OLLAMA_NUM_CTX: ~3k tokens per result, which
 * at ~450 tok/s of prefill is a few seconds each. Raise both together.
 */
export const MAX_TOOL_RESULT_CHARS = 12_000;

export const TRUNCATION_NOTICE =
  '\n…[truncated: ask for a narrower slice of this data]';

/** Key the structural truncation note is attached under, in the model's view. */
export const TRUNCATION_KEY = '_truncated';

/** Where a payload's root goes when it is an array and has to be wrapped. */
export const TRUNCATION_ITEMS_KEY = 'items';

/**
 * Character-level fallback. Leaves the model malformed JSON, so it is only used
 * when there are no lists left to shorten.
 */
export const truncate = (text: string, max = MAX_TOOL_RESULT_CHARS) =>
  text.length <= max ? text : text.slice(0, max) + TRUNCATION_NOTICE;

interface Cut {
  /** Dotted path to the shortened array, with array indices collapsed. */
  path: string;
  shown: number;
  total: number;
}

const ROOT_PATH = 'result';

/**
 * Serializes a tool result to at most `max` characters while keeping it valid
 * JSON: lists are shortened rather than the string being cut mid-token, and a
 * note says how many items of each list were kept. A model given a half-written
 * object fixates on the damage; one given fewer rows and a count uses the rows.
 */
export const serializeToolResult = (
  value: unknown,
  max = MAX_TOOL_RESULT_CHARS,
): string => {
  const full = JSON.stringify(value) ?? '';
  if (full.length <= max) return full;

  // Largest per-list cap that still fits. Lists shrink together, so a payload
  // with one long list keeps far more of it than a wide, evenly split one.
  let best: string | undefined;
  let low = 0;
  let high = longestArray(value);

  while (low <= high) {
    const limit = Math.floor((low + high) / 2);
    const cuts: Cut[] = [];
    const text = withNote(capArrays(value, limit, '', cuts), cuts);
    if (text.length <= max) {
      best = text;
      low = limit + 1;
    } else {
      high = limit - 1;
    }
  }

  // Nothing list-shaped to trim — the bulk is in scalars or object keys.
  return best ?? truncate(full, max);
};

/**
 * Same, for text that came back from an MCP server. Most servers answer with
 * JSON, so parse it and trim structurally; anything else falls back to chars.
 */
export const serializeToolText = (
  text: string,
  max = MAX_TOOL_RESULT_CHARS,
): string => {
  if (text.length <= max) return text;
  try {
    return serializeToolResult(JSON.parse(text), max);
  } catch {
    return truncate(text, max);
  }
};

const longestArray = (value: unknown): number => {
  if (Array.isArray(value)) {
    return value.reduce<number>(
      (longest, item) => Math.max(longest, longestArray(item)),
      value.length,
    );
  }
  if (isRecord(value)) {
    return Object.values(value).reduce<number>(
      (longest, item) => Math.max(longest, longestArray(item)),
      0,
    );
  }
  return 0;
};

const capArrays = (
  value: unknown,
  limit: number,
  path: string,
  cuts: Cut[],
): unknown => {
  if (Array.isArray(value)) {
    const kept = value.slice(0, limit);
    if (kept.length < value.length) {
      record(cuts, { path: path || ROOT_PATH, shown: kept.length, total: value.length });
    }
    // Items share their parent's path so sibling lists collapse into one note.
    return kept.map((item) => capArrays(item, limit, path, cuts));
  }
  if (isRecord(value)) {
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [
        key,
        capArrays(item, limit, path ? `${path}.${key}` : key, cuts),
      ]),
    );
  }
  return value;
};

/** Keeps the worst cut per path, so one note covers every sibling list. */
const record = (cuts: Cut[], cut: Cut): void => {
  const existing = cuts.find(({ path }) => path === cut.path);
  if (!existing) {
    cuts.push(cut);
    return;
  }
  existing.total = Math.max(existing.total, cut.total);
  existing.shown = Math.min(existing.shown, cut.shown);
};

const withNote = (value: unknown, cuts: Cut[]): string => {
  if (cuts.length === 0) return JSON.stringify(value) ?? '';

  const note = [
    cuts
      .map(({ path, shown, total }) => `${path}: showing ${shown} of ${total}`)
      .join('; '),
    'Ask for a narrower slice (a filter, or a smaller limit) to see the rest.',
  ].join('. ');

  return JSON.stringify(
    isRecord(value)
      ? { ...value, [TRUNCATION_KEY]: note }
      : { [TRUNCATION_ITEMS_KEY]: value, [TRUNCATION_KEY]: note },
  );
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);
