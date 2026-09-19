import type { ScheduledGame, ScoredGameLogEntry } from '../sports.types.js';
import { playerHeadToHead, teamSeries } from './head-to-head.js';

const entry = (
  week: number | null,
  fantasyPoints: number,
  date: string | null = null,
): ScoredGameLogEntry => ({
  date,
  week,
  opponent: null,
  isHome: null,
  stats: {},
  fantasyPoints,
});

const player = (id: string) => ({ id, name: id, team: null, position: null });

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

describe('playerHeadToHead', () => {
  it('counts only the games both players appeared in', () => {
    const result = playerHeadToHead([
      { player: player('a'), entries: [entry(1, 10), entry(2, 5), entry(3, 30)] },
      { player: player('b'), entries: [entry(1, 4), entry(2, 9)] },
    ]);

    // Week 3 is a's alone, so it cannot swing the head-to-head.
    expect(result.sharedGames).toBe(2);
    expect(result.leader).toBe(null);
    expect(result.records).toEqual([
      { playerId: 'a', name: 'a', wins: 1, ties: 0, averageMargin: 1 },
      { playerId: 'b', name: 'b', wins: 1, ties: 0, averageMargin: -1 },
    ]);
  });

  it('names a leader and reports ties as neither player winning', () => {
    const result = playerHeadToHead([
      { player: player('a'), entries: [entry(1, 10), entry(2, 8)] },
      { player: player('b'), entries: [entry(1, 4), entry(2, 8)] },
    ]);

    expect(result.leader).toBe('a');
    expect(result.games[1].winner).toBe(null);
    expect(result.records[0]).toMatchObject({ wins: 1, ties: 1 });
  });

  it('matches baseball players by date, since baseball has no weeks', () => {
    const result = playerHeadToHead([
      {
        player: player('a'),
        entries: [entry(null, 6, '2026-08-01'), entry(null, 2, '2026-08-02')],
      },
      { player: player('b'), entries: [entry(null, 3, '2026-08-02')] },
    ]);

    expect(result.sharedGames).toBe(1);
    expect(result.games[0].date).toBe('2026-08-02');
    expect(result.leader).toBe('b');
  });

  // Two players in the same NFL week can kick off on different days.
  it('matches football players by week even when the dates differ', () => {
    const result = playerHeadToHead([
      { player: player('a'), entries: [entry(1, 20, '2026-09-10')] },
      { player: player('b'), entries: [entry(1, 8, '2026-09-13')] },
    ]);

    expect(result.sharedGames).toBe(1);
    expect(result.leader).toBe('a');
  });

  it('returns an empty head-to-head when they never overlapped', () => {
    const result = playerHeadToHead([
      { player: player('a'), entries: [entry(1, 10)] },
      { player: player('b'), entries: [entry(2, 10)] },
    ]);

    expect(result).toMatchObject({ sharedGames: 0, leader: null, games: [] });
    expect(result.records[0].averageMargin).toBe(0);
  });
});

describe('teamSeries', () => {
  const games = [
    game('2026-04-10', 'NYY', 'BOS', { home: 9, away: 6 }),
    game('2026-04-11', 'NYY', 'BOS', { home: 1, away: 4 }),
    game('2026-06-02', 'BOS', 'NYY', { home: 3, away: 5 }),
    game('2026-09-20', 'BOS', 'NYY'),
  ];

  it('folds the meetings into a record for each side', () => {
    const series = teamSeries(games, ['NYY', 'BOS']);

    expect(series).toMatchObject({
      played: 3,
      upcoming: 1,
      nextMeeting: '2026-09-20',
    });
    expect(series.records[0]).toEqual({
      team: 'NYY',
      wins: 2,
      losses: 1,
      ties: 0,
      scoredFor: 15,
      scoredAgainst: 13,
      homeWins: 1,
      awayWins: 1,
    });
    expect(series.records[1]).toMatchObject({ wins: 1, losses: 2 });
  });

  // A game in progress carries a running score; counting it would invent a result.
  it('leaves an unplayed game out of the record', () => {
    const series = teamSeries([games[3]], ['NYY', 'BOS']);

    expect(series.played).toBe(0);
    expect(series.games[0].winner).toBe(null);
    expect(series.records.every(({ wins, losses }) => !wins && !losses)).toBe(
      true,
    );
  });

  it('orders the games oldest first however the provider returned them', () => {
    const series = teamSeries([...games].reverse(), ['NYY', 'BOS']);

    expect(series.games.map(({ date }) => date)).toEqual([
      '2026-04-10',
      '2026-04-11',
      '2026-06-02',
      '2026-09-20',
    ]);
  });
});
