import {
  absent,
  checkExpectations,
  contains,
  includesAll,
  looseEquals,
  oneOf,
  present,
  where,
} from './eval.match.js';
import type { RecordedCall } from './eval.types.js';

const call = (
  name: string,
  args: Record<string, unknown> = {},
  isError = false,
): RecordedCall => ({ name, arguments: args, isError });

describe('looseEquals', () => {
  it('ignores casing and surrounding space in strings', () => {
    expect(looseEquals(' MLB ', 'mlb')).toBe(true);
    expect(looseEquals('nfl', 'mlb')).toBe(false);
  });

  it('crosses the string/number line small models blur', () => {
    expect(looseEquals('3', 3)).toBe(true);
    expect(looseEquals(3, '3')).toBe(true);
    expect(looseEquals('three', 3)).toBe(false);
  });

  it('compares arrays as sets, since order carries no meaning', () => {
    expect(looseEquals(['recYd', 'rec'], ['rec', 'recYd'])).toBe(true);
    expect(looseEquals(['rec'], ['rec', 'recYd'])).toBe(false);
  });

  it('treats a bare array in a case as an array argument, not a set of choices', () => {
    expect(looseEquals('rec', ['rec', 'recYd'])).toBe(false);
  });
});

describe('matchers', () => {
  it('oneOf accepts any listed value', () => {
    expect(oneOf('ALE', 'AL East').test('al east', true)).toBe(true);
    expect(oneOf('ALE', 'AL East').test('NLE', true)).toBe(false);
  });

  it('present and absent turn on whether the key was sent', () => {
    expect(present().test(undefined, true)).toBe(true);
    expect(present().test('x', false)).toBe(false);
    expect(absent().test(undefined, false)).toBe(true);
    expect(absent().test(4, true)).toBe(false);
  });

  it('contains matches part of a string, case-insensitively', () => {
    expect(contains('homeRun').test('homeRuns', true)).toBe(true);
    expect(contains('ppr').test('half_ppr', true)).toBe(true);
    expect(contains('ppr').test('std', true)).toBe(false);
  });

  it('includesAll allows extra entries the question did not ask about', () => {
    expect(includesAll('games').test(['totals', 'games'], true)).toBe(true);
    expect(includesAll(1, 2).test([2, 1, 3], true)).toBe(true);
    expect(includesAll(1, 9).test([1, 2], true)).toBe(false);
  });

  it('where takes a predicate for anything else', () => {
    const twoIds = where('two ids', (v) => Array.isArray(v) && v.length === 2);
    expect(twoIds.test(['a', 'b'], true)).toBe(true);
    expect(twoIds.test(['a'], true)).toBe(false);
  });
});

describe('checkExpectations', () => {
  it('passes when a call matches, whatever else was called', () => {
    const failures = checkExpectations(
      [{ tool: 'get_leaderboard', args: { sport: 'mlb' } }],
      [],
      [call('find_player', { query: 'judge' }), call('get_leaderboard', { sport: 'MLB' })],
    );
    expect(failures).toEqual([]);
  });

  it('ignores arguments the case did not pin', () => {
    const failures = checkExpectations(
      [{ tool: 'get_leaderboard', args: { sport: 'nfl' } }],
      [],
      [call('get_leaderboard', { sport: 'nfl', limit: 25, scoring: 'ppr' })],
    );
    expect(failures).toEqual([]);
  });

  it('says what was called instead when the tool never came up', () => {
    const [failure] = checkExpectations(
      [{ tool: 'get_expected_points' }],
      [],
      [call('get_leaderboard', { sport: 'nfl' })],
    );
    expect(failure).toContain('never called get_expected_points');
    expect(failure).toContain('get_leaderboard');
  });

  it('distinguishes the right tool with wrong arguments', () => {
    const [failure] = checkExpectations(
      [{ tool: 'get_leaderboard', args: { week: 3 } }],
      [],
      [call('get_leaderboard', { sport: 'nfl' })],
    );
    expect(failure).toContain('called get_leaderboard but not');
    expect(failure).toContain('week=3');
  });

  it('reports a forbidden tool the model reached for', () => {
    const [failure] = checkExpectations(
      [],
      ['get_pitcher_starts'],
      [call('get_pitcher_starts', { sport: 'mlb' })],
    );
    expect(failure).toContain('called get_pitcher_starts');
  });

  it('passes a case that only forbids, when nothing forbidden was called', () => {
    expect(
      checkExpectations([], ['get_user_leagues'], [call('find_player', { query: 'x' })]),
    ).toEqual([]);
  });
});
