import {
  MAX_TOOL_RESULT_CHARS,
  TRUNCATION_KEY,
} from '../../common/text/truncate.js';
import { serializeToolResult } from '../../common/text/truncate.js';
import { MLB_GROUPS } from '../sports/providers/mlb/mlb.constants.js';
import { STAT_FORMATS } from '../sports/sports.constants.js';
import type { StatGroup } from '../sports/sports.types.js';
import {
  PROBABLES_LIMIT,
  STARTS_LIMIT,
  STATUS_LIMIT,
} from './baseball/baseball-tools.constants.js';
import {
  FIND_PLAYER_LIMIT,
  LEADERBOARD_LIMIT,
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

const expectFits = (limit: ToolLimit, row: unknown, label: string) => {
  const { truncated, chars } = fits(Array.from({ length: limit.max }, () => row));
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

  it('get_pitcher_starts at its maximum', () => {
    const start = {
      date: '2026-09-16',
      opponent: 'LAD',
      isHome: true,
      confidence: 'projected',
      matchup: {
        score: 62.5,
        grade: 'good',
        metrics: [
          { key: 'ops', label: 'OPS', value: 0.712, rank: 62.5 },
          { key: 'runsPerGame', label: 'Runs per game', value: 4.321, rank: 55.1 },
          { key: 'strikeoutRate', label: 'Strikeout rate', value: 0.234, rank: 71.2 },
        ],
      },
    };
    expectFits(
      STARTS_LIMIT,
      { player, starts: [start, start], confirmedStarts: 1, matchupScore: 62.5 },
      'get_pitcher_starts',
    );
  });

  it('get_probable_pitchers at its maximum', () => {
    expectFits(
      PROBABLES_LIMIT,
      {
        player,
        date: '2026-09-16',
        opponent: 'LAD',
        isHome: true,
        confidence: 'confirmed',
        matchup: {
          score: 62.5,
          grade: 'good',
          metrics: [
            { key: 'ops', label: 'OPS', value: 0.712, rank: 62.5 },
            { key: 'runsPerGame', label: 'Runs per game', value: 4.321, rank: 55.1 },
          ],
        },
      },
      'get_probable_pitchers',
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

  it('find_player at its maximum', () => {
    expectFits(
      FIND_PLAYER_LIMIT,
      { ...player, group: 'pitching', gamesPlayed: 32, fantasyPoints: 1234.56 },
      'find_player',
    );
  });
});
