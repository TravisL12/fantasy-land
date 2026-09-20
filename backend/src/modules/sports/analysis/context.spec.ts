import type { ScoredStatLine } from '../sports.types.js';
import { leagueContext } from './context.js';

const line = (
  id: string,
  position: string | null,
  fantasyPoints: number,
): ScoredStatLine => ({
  player: { id, name: id, team: null, position },
  gamesPlayed: 17,
  stats: {},
  fantasyPoints,
  fantasyPointsPerGame: fantasyPoints / 17,
});

// Three receivers and two quarterbacks, so a cross-position mix-up shows up.
const pool = [
  line('wr1', 'WR', 300),
  line('wr2', 'WR', 200),
  line('wr3', 'WR', 100),
  line('qb1', 'QB', 400),
  line('qb2', 'QB', 380),
];

describe('leagueContext', () => {
  it('ranks a player within their own position, not the whole group', () => {
    const context = leagueContext(pool, 'wr1');

    // Top receiver, though two quarterbacks outscored him.
    expect(context).toMatchObject({ position: 'WR', pool: 3, rank: 1 });
    expect(context?.percentile).toBe(100);
  });

  it('puts the bottom of a position at the zeroth percentile', () => {
    expect(leagueContext(pool, 'wr3')?.percentile).toBe(0);
  });

  it('reports the middle of the position, for a sense of the spread', () => {
    expect(leagueContext(pool, 'wr2')).toMatchObject({
      rank: 2,
      percentile: 50,
      median: 200,
    });
  });

  it('leaves value over replacement alone when no baseline was given', () => {
    expect(leagueContext(pool, 'wr1')?.replacement).toBeUndefined();
  });

  it('measures against the baseline rank the caller defined', () => {
    const context = leagueContext(pool, 'wr1', { replacementRank: 3 });

    expect(context?.replacement).toEqual({
      rank: 3,
      fantasyPoints: 100,
      valueOver: 200,
    });
  });

  it('clamps a baseline past the end of the pool to its last player', () => {
    const context = leagueContext(pool, 'wr1', { replacementRank: 36 });

    expect(context?.replacement).toMatchObject({ fantasyPoints: 100 });
  });

  it('ranks an unpositioned player against everyone rather than not at all', () => {
    const mixed = [line('a', null, 50), line('b', null, 10)];

    expect(leagueContext(mixed, 'a')).toMatchObject({
      position: null,
      pool: 2,
      rank: 1,
    });
  });

  it('returns nothing for a player outside the pool', () => {
    expect(leagueContext(pool, 'nobody')).toBeNull();
  });

  it('calls a one-player position the top of it rather than dividing by zero', () => {
    expect(leagueContext([line('k1', 'K', 120)], 'k1')?.percentile).toBe(100);
  });
});
