import type { StatDefinition } from '../sports.types.js';
import {
  calculateFantasyPoints,
  perGame,
  sumStats,
  summarizePoints,
} from './scoring.js';

describe('scoring', () => {
  it('applies per-unit weights and ignores unscored stats', () => {
    expect(
      calculateFantasyPoints(
        { rec: 129, rec_yd: 1715, rec_td: 10, targets: 166 },
        { rec: 1, rec_yd: 0.1, rec_td: 6 },
      ),
    ).toBe(360.5);
  });

  it('guards per-game math against zero games', () => {
    expect(perGame(10, 0)).toBe(0);
    expect(perGame(10, 3)).toBe(3.33);
  });

  it('summarizes a points distribution', () => {
    expect(summarizePoints([10, 20, 30, 40])).toEqual({
      games: 4,
      total: 100,
      average: 25,
      median: 25,
      stdDev: 11.18,
      floor: 10,
      ceiling: 40,
    });
    expect(summarizePoints([]).games).toBe(0);
  });

  it('only totals summable stats', () => {
    const defs = [
      { key: 'hits', summable: true },
      { key: 'avg', summable: false },
    ] as StatDefinition[];
    expect(
      sumStats(
        [
          { hits: 2, avg: 0.5 },
          { hits: 1, avg: 0.25 },
        ],
        defs,
      ),
    ).toEqual({
      hits: 3,
    });
  });
});
