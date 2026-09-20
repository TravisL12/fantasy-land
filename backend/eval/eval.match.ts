import type { ArgMatcher, ExpectedCall, Matcher, RecordedCall } from './eval.types.js';

const isMatcher = (value: unknown): value is Matcher =>
  typeof value === 'object' &&
  value !== null &&
  (value as Matcher).kind === 'matcher';

const matcher = (
  describe: string,
  test: (value: unknown, present: boolean) => boolean,
): Matcher => ({ kind: 'matcher', describe, test });

const quote = (value: unknown) =>
  typeof value === 'string' ? `"${value}"` : String(value);

/**
 * Loose equality, because the thing under test is whether the model understood
 * the question — not whether it typed "MLB" or "mlb", or sent a week as 4 or
 * "4". `tools.utils.ts` already coerces both on the way in, so asserting
 * strictly here would fail cases the app itself handles.
 */
export const looseEquals = (actual: unknown, expected: unknown): boolean => {
  if (Array.isArray(expected)) {
    // Set semantics: ["rec","recYd"] and ["recYd","rec"] are the same request.
    return (
      Array.isArray(actual) &&
      actual.length === expected.length &&
      expected.every((want) => actual.some((got) => looseEquals(got, want)))
    );
  }
  if (typeof expected === 'string' && typeof actual === 'string') {
    return actual.trim().toLowerCase() === expected.trim().toLowerCase();
  }
  if (typeof expected === 'number' || typeof actual === 'number') {
    const a = Number(actual);
    const b = Number(expected);
    return !Number.isNaN(a) && !Number.isNaN(b) && a === b;
  }
  return Object.is(actual, expected);
};

const test = (want: ArgMatcher, value: unknown, present: boolean): boolean =>
  isMatcher(want) ? want.test(value, present) : present && looseEquals(value, want);

// --- Matchers -------------------------------------------------------------
// Spelled out rather than inferred, so a bare array in a case is an array
// argument and not a set of alternatives.

/** Any one of these values. */
export const oneOf = (...values: unknown[]): Matcher =>
  matcher(
    `one of ${values.map(quote).join(', ')}`,
    (value, present) => present && values.some((want) => looseEquals(value, want)),
  );

/**
 * Either this value, or nothing at all — for an argument whose default is
 * already what the question needs.
 *
 * The tools default `sport`, so a football question answered without it is
 * answered correctly. Asserting it strictly there measures whether the model
 * followed the system prompt's "pass sport explicitly every time", which is
 * advice rather than a result. Where the default would be *wrong* — a baseball
 * question on a tool that defaults to football — the case still pins it.
 */
export const orDefault = (value: unknown): Matcher =>
  matcher(
    `${quote(value)} or absent`,
    (actual, isPresent) => !isPresent || looseEquals(actual, value),
  );

/** The argument was sent at all, whatever its value. */
export const present = (): Matcher =>
  matcher('present', (_value, isPresent) => isPresent);

/** The argument was left out — how a case asserts a default was not overridden. */
export const absent = (): Matcher =>
  matcher('absent', (value, isPresent) => !isPresent || value === undefined);

/** A string containing this text, case-insensitively. */
export const contains = (text: string): Matcher =>
  matcher(
    `containing "${text}"`,
    (value, isPresent) =>
      isPresent &&
      typeof value === 'string' &&
      value.toLowerCase().includes(text.toLowerCase()),
  );

/** An array holding at least these entries, in any order. */
export const includesAll = (...wanted: unknown[]): Matcher =>
  matcher(
    `including ${wanted.map(quote).join(', ')}`,
    (value, isPresent) =>
      isPresent &&
      Array.isArray(value) &&
      wanted.every((want) => value.some((got) => looseEquals(got, want))),
  );

/** An escape hatch for anything the helpers above do not cover. */
export const where = (
  describe: string,
  predicate: (value: unknown) => boolean,
): Matcher => matcher(describe, (value, isPresent) => isPresent && predicate(value));

// --- Assertion ------------------------------------------------------------

/** Every asserted argument matched. */
const callMatches = ({ tool, args = {} }: ExpectedCall, call: RecordedCall) =>
  call.name === tool &&
  Object.entries(args).every(([key, want]) =>
    test(want, call.arguments[key], key in call.arguments),
  );

const describeArgs = (args: Record<string, ArgMatcher>) =>
  Object.entries(args)
    .map(([key, want]) => `${key}=${isMatcher(want) ? want.describe : quote(want)}`)
    .join(', ');

const describeCall = ({ name, arguments: args, isError }: RecordedCall) =>
  `${name}(${JSON.stringify(args)})${isError ? ' -> error' : ''}`;

/**
 * Why a case failed, one line per unmet expectation. Deliberately verbose: the
 * point of a failing eval is to show what the model reached for instead, and a
 * bare "expected get_leaderboard" sends you to the transcript to find out.
 */
export const checkExpectations = (
  expected: ExpectedCall[],
  forbidden: readonly string[],
  calls: RecordedCall[],
): string[] => {
  const failures: string[] = [];

  for (const want of expected) {
    if (calls.some((call) => callMatches(want, call))) continue;

    const sameTool = calls.filter(({ name }) => name === want.tool);
    const detail = want.args ? ` with ${describeArgs(want.args)}` : '';
    failures.push(
      sameTool.length === 0
        ? `never called ${want.tool}${detail}; called ${
            calls.length === 0
              ? 'nothing'
              : calls.map(describeCall).join(', ')
          }`
        : `called ${want.tool} but not${detail}; got ${sameTool
            .map(describeCall)
            .join(', ')}`,
    );
  }

  for (const name of forbidden) {
    if (calls.some((call) => call.name === name)) {
      failures.push(`called ${name}, which this question must not need`);
    }
  }

  return failures;
};
