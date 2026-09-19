import type {
  ScheduledGame,
  ScoredStatLine,
  StatGroup,
} from '../sports.types.js';
import {
  recentResults,
  sumTeamStats,
  teamLeaders,
  teamRecord,
} from './preview.js';

const game = (
  date: string,
  home: string,
  away: string,
  score: ScheduledGame['score'] = null,
): ScheduledGame => ({
  gameId: `${date}-${home}`,
  date,
  week: null,
  status: score ? 'Final' : 'Scheduled',
  home,
  away,
  probables: { home: null, away: null },
  score,
});

const line = (
  name: string,
  fantasyPoints: number,
  stats: Record<string, number>,
): ScoredStatLine => ({
  player: { id: name, name, team: 'KC', position: 'WR' },
  gamesPlayed: 2,
  fantasyPoints,
  fantasyPointsPerGame: fantasyPoints / 2,
  stats,
});

const group: StatGroup = {
  key: 'offense',
  label: 'Offense',
  positions: ['WR'],
  defaultStats: ['rec', 'catchPct'],
  stats: [
    { key: 'rec', label: 'Receptions', abbr: 'REC', format: 'int', summable: true },
    { key: 'yards', label: 'Yards', abbr: 'YD', format: 'int', summable: true },
    {
      key: 'catchPct',
      label: 'Catch rate',
      abbr: 'C%',
      format: 'percent',
      summable: false,
    },
  ],
};

describe('teamRecord', () => {
  it('counts wins, losses and draws from finished games only', () => {
    const record = teamRecord(
      [
        game('2026-09-07', 'KC', 'BUF', { home: 24, away: 21 }),
        game('2026-09-14', 'DEN', 'KC', { home: 17, away: 10 }),
        game('2026-09-21', 'KC', 'LV', { home: 13, away: 13 }),
        game('2026-09-28', 'KC', 'SF'),
      ],
      'KC',
    );

    expect(record).toEqual({
      wins: 1,
      losses: 1,
      ties: 1,
      scoredFor: 47,
      scoredAgainst: 51,
    });
  });

  it('ignores games the team was not in', () => {
    const record = teamRecord(
      [game('2026-09-07', 'SF', 'SEA', { home: 30, away: 3 })],
      'KC',
    );

    expect(record).toEqual({
      wins: 0,
      losses: 0,
      ties: 0,
      scoredFor: 0,
      scoredAgainst: 0,
    });
  });
});

describe('recentResults', () => {
  it('returns finished games newest first, capped', () => {
    const results = recentResults(
      [
        game('2026-09-07', 'KC', 'BUF', { home: 24, away: 21 }),
        game('2026-09-14', 'DEN', 'KC', { home: 17, away: 10 }),
        game('2026-09-28', 'KC', 'SF'),
      ],
      1,
    );

    expect(results).toHaveLength(1);
    expect(results[0]).toMatchObject({ date: '2026-09-14', winner: 'DEN' });
  });
});

describe('sumTeamStats', () => {
  /**
   * Adding eleven catch rates together produces a number that looks like a
   * team rate and is not one, so a non-summable stat is left out entirely.
   */
  it('adds counting stats and drops rates', () => {
    const totals = sumTeamStats(
      [
        line('a', 20, { rec: 5, yards: 60, catchPct: 0.7 }),
        line('b', 10, { rec: 3, yards: 25, catchPct: 0.5 }),
      ],
      group,
    );

    expect(totals).toEqual({ rec: 8, yards: 85 });
  });

  it('leaves out a stat nobody in the group recorded', () => {
    expect(sumTeamStats([line('a', 5, { rec: 2 })], group)).toEqual({ rec: 2 });
  });
});

describe('teamLeaders', () => {
  it('ranks by fantasy points and keeps only the named stats', () => {
    const leaders = teamLeaders(
      [
        line('Rice', 18, { rec: 5, yards: 60, catchPct: 0.7 }),
        line('Worthy', 31, { rec: 7, yards: 95, catchPct: 0.8 }),
      ],
      ['rec'],
      1,
    );

    expect(leaders).toHaveLength(1);
    expect(leaders[0]).toMatchObject({
      fantasyPoints: 31,
      pointsPerGame: 15.5,
      stats: { rec: 7 },
    });
  });
});
