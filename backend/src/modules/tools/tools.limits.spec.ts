import {
  MAX_TOOL_RESULT_CHARS,
  TRUNCATION_KEY,
} from '../../common/text/truncate.js';
import { serializeToolResult } from '../../common/text/truncate.js';
import { MLB_GROUPS } from '../sports/providers/mlb/mlb.constants.js';
import {
  STANDINGS_METHOD,
  STAT_FORMATS,
} from '../sports/sports.constants.js';
import type { StatGroup } from '../sports/sports.types.js';
import {
  MATCHUP_LIMIT,
  STARTS_LIMIT,
} from './baseball/baseball-tools.constants.js';
import {
  EXPECTED_POINTS_LIMIT,
  EXPECTED_POINTS_METHOD,
} from './football/football-tools.constants.js';
import {
  FIND_PLAYER_LIMIT,
  LEADERBOARD_LIMIT,
  SCHEDULE_LIMIT,
  STATUS_LIMIT,
} from './sports/sports-tools.constants.js';
import type { ToolLimit } from './tools.types.js';

/**
 * A limit the model is told it may ask for has to fit inside
 * MAX_TOOL_RESULT_CHARS, or the tool truncates itself on arguments we invited
 * — and the model reports our own cap back to the user as a failure.
 *
 * Rows are built from the real stat-group definitions rather than hardcoded
 * fixtures, so adding stats to a group fails this instead of silently pushing
 * a documented maximum out of reach.
 */
const player = {
  id: '000000',
  name: 'Firstname Lastname',
  team: 'ATL',
  position: 'SP',
};

/**
 * A value of the size that format really serializes to — a counting stat is a
 * short integer, a rate is three decimals. Guessing one size for all of them
 * makes the fixture fatter than any real row and fails on headroom we have.
 */
const SAMPLE_VALUES: Record<string, number> = {
  [STAT_FORMATS.int]: 42,
  [STAT_FORMATS.decimal]: 12.34,
  [STAT_FORMATS.rate]: 0.321,
  [STAT_FORMATS.percent]: 0.567,
  [STAT_FORMATS.innings]: 184.667,
};

const statsFor = (group: StatGroup) =>
  Object.fromEntries(
    group.stats.map(({ key, format }) => [key, SAMPLE_VALUES[format] ?? 42]),
  );

const widestGroup = (groups: StatGroup[]) =>
  groups.reduce((widest, group) =>
    group.stats.length > widest.stats.length ? group : widest,
  );

const fits = (rows: unknown[], extra: Record<string, unknown> = {}) => {
  const text = serializeToolResult({ ...extra, total: rows.length, rows });
  return { truncated: text.includes(`"${TRUNCATION_KEY}"`), chars: text.length };
};

const expectFits = (
  limit: ToolLimit,
  row: unknown,
  label: string,
  /** Everything the result carries beside the rows, which is not free either. */
  extra: Record<string, unknown> = {},
) => {
  const { truncated, chars } = fits(
    Array.from({ length: limit.max }, () => row),
    extra,
  );
  expect(
    truncated,
    `${label}: ${limit.max} rows serialize to ${chars} chars, over the ${MAX_TOOL_RESULT_CHARS} cap. ` +
      `Lower the limit or raise MAX_TOOL_RESULT_CHARS.`,
  ).toBe(false);
};

describe('tool limits fit inside MAX_TOOL_RESULT_CHARS', () => {
  /**
   * MLB, not NFL, is the binding case even though NFL's offense group defines
   * more stats. An MLB hitting row really does carry every stat in its group,
   * while an NFL row is sparse — a receiver has no passing stats, and stats a
   * player did not produce are dropped during mapping. Filling the whole NFL
   * group would model a row that cannot exist (~23.7k chars against ~13.5k
   * measured live) and would fail on headroom we actually have.
   */
  /**
   * The worst case is a model that names every stat key: the default is the
   * group's headline stats, but `stats` may ask for all of them.
   */
  it('get_leaderboard at its maximum (mlb, widest stat group)', () => {
    const group = widestGroup(MLB_GROUPS);
    const row = {
      ...player,
      gamesPlayed: 162,
      fantasyPoints: 1234.56,
      fantasyPointsPerGame: 12.34,
      stats: statsFor(group),
    };
    expectFits(LEADERBOARD_LIMIT, row, `get_leaderboard (mlb/${group.key})`);
  });

  /**
   * The chat-facing shape: a start carries the matchup score and grade it is
   * compared on, not the per-metric breakdown. Sizing this against the full
   * rating would reserve room for fields the model is never sent.
   */
  it('get_pitcher_starts at its maximum', () => {
    const start = {
      date: '2026-09-16',
      opponent: 'LAD',
      isHome: true,
      confidence: 'projected',
      matchup: { score: 62.5, grade: 'good' },
    };
    expectFits(
      STARTS_LIMIT,
      { player, starts: [start, start], confirmedStarts: 1, matchupScore: 62.5 },
      'get_pitcher_starts',
    );
  });

  /**
   * A baseball fixture is the wide case: football has no probable starters, so
   * its games carry no pitcher at all.
   */
  it('get_schedule at its maximum', () => {
    expectFits(
      SCHEDULE_LIMIT,
      {
        gameId: '824382',
        date: '2026-09-16',
        week: null,
        status: 'Scheduled',
        home: 'PHI',
        away: 'ATL',
        score: { home: 5, away: 2 },
        probables: {
          home: {
            playerId: '668881',
            name: 'Firstname Lastname',
            matchup: { score: 62.5, grade: 'good' },
          },
          away: {
            playerId: '694973',
            name: 'Firstname Lastname',
            matchup: { score: 41.2, grade: 'neutral' },
          },
        },
      },
      'get_schedule',
    );
  });

  /**
   * Standings take no limit argument — a league has the divisions it has — so
   * the check is that the whole table fits rather than that a cap does. MLB is
   * the wide case: thirty clubs, six divisions and a wild-card race each.
   */
  it('get_standings for a whole league', () => {
    const team = (index: number) => ({
      team: 'ATL',
      name: 'Team Nameofclub',
      wins: 93,
      losses: 60,
      ties: 0,
      winPct: 0.608,
      gamesPlayed: 153,
      gamesRemaining: 9,
      gamesBack: 18.5,
      scoredFor: 700,
      scoredAgainst: 622,
      streak: 'L1',
      rank: index + 1,
      playoffSeed: null,
      clinch: 'contending',
      clinchNote: 'Clinched playoff berth',
      magicNumber: 14,
      eliminationNumber: 6,
      wildCard: { gamesBack: 3.5, eliminationNumber: 12 },
    });
    const groups = Array.from({ length: 6 }, (_, division) => ({
      key: 'ALE',
      name: 'AL East',
      conference: 'AL',
      teams: Array.from({ length: 5 }, (_, i) => team(division + i)),
    }));

    const text = serializeToolResult({
      sport: 'mlb',
      season: '2026',
      method: STANDINGS_METHOD.computed,
      groups,
    });
    expect(
      text.includes(`"${TRUNCATION_KEY}"`),
      `get_standings: a whole MLB table serializes to ${text.length} chars, ` +
        `over the ${MAX_TOOL_RESULT_CHARS} cap.`,
    ).toBe(false);
  });

  it('get_matchup_ratings at its maximum', () => {
    expectFits(
      MATCHUP_LIMIT,
      {
        team: 'LAD',
        score: 62.5,
        grade: 'good',
        metrics: [
          { key: 'ops', value: 0.712, rank: 62.5 },
          { key: 'runsPerGame', value: 4.321, rank: 55.1 },
          { key: 'strikeoutRate', value: 0.234, rank: 71.2 },
        ],
      },
      'get_matchup_ratings',
    );
  });

  it('get_player_status at its maximum', () => {
    expectFits(
      STATUS_LIMIT,
      {
        playerId: '000000',
        name: 'Firstname Lastname',
        team: 'ATL',
        position: 'SP',
        status: 'Injured 60-Day',
        availability: 'injured',
      },
      'get_player_status',
    );
  });

  /**
   * An expected-points row carries no stats object in a chat turn, but it does
   * carry eight computed numbers, and the result pays for the method note and
   * one model summary per position on top of the rows.
   */
  it('get_expected_points at its maximum', () => {
    expectFits(
      EXPECTED_POINTS_LIMIT,
      {
        ...player,
        gamesPlayed: 17,
        fantasyPoints: 234.56,
        pointsPerGame: 13.8,
        expectedPoints: 212.34,
        expectedPointsPerGame: 12.5,
        delta: 22.22,
        deltaPerGame: 1.3,
        efficiency: 1.1,
        model: 'WR',
      },
      'get_expected_points',
      {
        method: EXPECTED_POINTS_METHOD,
        models: ['QB', 'RB', 'WR', 'TE'].map((position) => ({
          position,
          observations: 120,
          rSquared: 0.86,
        })),
      },
    );
  });

  /**
   * The widest find_player row is a directory-only one: a player with no stats
   * carries their roster status and availability instead.
   */
  it('find_player at its maximum', () => {
    expectFits(
      FIND_PLAYER_LIMIT,
      {
        ...player,
        group: 'pitching',
        gamesPlayed: 32,
        fantasyPoints: 1234.56,
        status: 'Physically Unable to Perform',
        availability: 'injured',
      },
      'find_player',
    );
  });
});
