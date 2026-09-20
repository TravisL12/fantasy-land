/**
 * A question the agent is expected to answer with a particular tool call.
 *
 * The eval asserts on *tool selection and arguments*, never on the prose. A
 * local model's wording varies run to run; which tool it reached for and what
 * it passed does not, and that is the part this codebase controls. Prose is
 * recorded so a failure can be read, not asserted on.
 */
export interface EvalCase {
  /** Stable id, so a run can be compared with the one before it. */
  id: string;
  question: string;
  /**
   * Calls the answer needs. Each must appear at least once anywhere in the run
   * — order is not asserted, since a model may legitimately look a player up
   * first, and the round it takes to do so is measured rather than failed.
   */
  expect: ExpectedCall[];
  /**
   * Tools that must not be called. These are the near neighbours: the schema
   * budget buys the model one more way to choose wrong, and this is where we
   * find out that it did.
   */
  forbid?: readonly string[];
  tags?: readonly string[];
  /** Why this case exists, printed beside a failure. */
  why?: string;
}

export interface ExpectedCall {
  tool: string;
  /**
   * A subset of the arguments. Keys left out are not asserted, so a case pins
   * the parts of the call that carry the question's meaning and stays quiet
   * about defaults the model is free to fill in.
   */
  args?: Record<string, ArgMatcher>;
}

/**
 * A plain value matches loosely — case-insensitively for strings, numerically
 * across the string/number line small models blur, and order-insensitively for
 * arrays. Anything looser is spelled out with a helper from eval.match.ts, so
 * a bare array in a case is an array argument rather than a set of choices.
 */
export type ArgMatcher = unknown | Matcher;

export interface Matcher {
  readonly kind: 'matcher';
  /** Printed in a failure, e.g. `one of "mlb", "nfl"`. */
  readonly describe: string;
  test(value: unknown, present: boolean): boolean;
}

/** One tool call the model made, with whether it came back an error. */
export interface RecordedCall {
  name: string;
  arguments: Record<string, unknown>;
  isError: boolean;
  /** The error message, when the call came back as one. */
  error?: string;
}

/** What one question cost and what it did. */
export interface EvalRun {
  calls: RecordedCall[];
  /** Assistant turns that produced tool calls — the latency dial. */
  toolRounds: number;
  answer: string;
  /** Set when the loop reported an error event or the case timed out. */
  error?: string;
  timedOut: boolean;
  durationMs: number;
}

export interface EvalResult {
  case: EvalCase;
  run: EvalRun;
  passed: boolean;
  /** One line per unmet expectation. */
  failures: string[];
}
