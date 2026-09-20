import { BadRequestException } from '@nestjs/common';
import type { StatDefinition, StatGroup } from '../sports.types.js';
import {
  meetsQualifyingLine,
  qualifyingLine,
  resolveQualifyingLine,
} from './qualify.js';

const plateAppearances: StatDefinition = {
  key: 'plateAppearances',
  label: 'Plate appearances',
  abbr: 'PA',
  format: 'int',
  summable: true,
};

const avg: StatDefinition = {
  key: 'avg',
  label: 'Batting average',
  abbr: 'AVG',
  format: 'rate',
  summable: false,
  qualifier: { stat: 'plateAppearances', perTeamGame: 3.1 },
};

const homeRuns: StatDefinition = {
  key: 'homeRuns',
  label: 'Home runs',
  abbr: 'HR',
  format: 'int',
  summable: true,
};

const group: StatGroup = {
  key: 'hitting',
  label: 'Hitting',
  positions: [],
  stats: [plateAppearances, avg, homeRuns],
  defaultStats: ['avg'],
};

const row = (gamesPlayed: number, stats: Record<string, number> = {}) => ({
  gamesPlayed,
  stats,
});

describe('qualifyingLine', () => {
  it('scales the league standard by the busiest player in the pool', () => {
    const line = qualifyingLine(avg, [row(162), row(20), row(100)]);

    expect(line).toEqual({
      stat: 'plateAppearances',
      minimum: 502.2,
      teamGames: 162,
    });
  });

  it('scales down over a window, where the pool played fewer games', () => {
    const line = qualifyingLine(avg, [row(12), row(4)]);

    expect(line?.minimum).toBe(37.2);
    expect(line?.teamGames).toBe(12);
  });

  it('leaves counting stats alone — nobody needs protecting from a home run list', () => {
    expect(qualifyingLine(homeRuns, [row(162)])).toBeNull();
    expect(qualifyingLine(undefined, [row(162)])).toBeNull();
  });

  it('returns nothing for an empty pool or a pool that has played nothing', () => {
    expect(qualifyingLine(avg, [])).toBeNull();
    expect(qualifyingLine(avg, [row(0)])).toBeNull();
  });
});

describe('meetsQualifyingLine', () => {
  const line = { stat: 'plateAppearances', minimum: 502.2, teamGames: 162 };

  it('keeps a player at or above the line', () => {
    expect(meetsQualifyingLine(row(150, { plateAppearances: 600 }), line)).toBe(
      true,
    );
  });

  it('drops the part-timer the line exists for', () => {
    expect(meetsQualifyingLine(row(9, { plateAppearances: 20 }), line)).toBe(
      false,
    );
  });

  it('treats a missing count as zero rather than as passing', () => {
    expect(meetsQualifyingLine(row(150), line)).toBe(false);
  });
});

describe('resolveQualifyingLine', () => {
  const pool = [row(162, { plateAppearances: 700 })];

  it('applies the sorted stat\'s own qualifier', () => {
    expect(resolveQualifyingLine(group, 'avg', {}, pool)?.minimum).toBe(502.2);
  });

  it('does not filter by a qualifier the ranking is not about', () => {
    expect(resolveQualifyingLine(group, 'homeRuns', {}, pool)).toBeNull();
  });

  it('lets an explicit minimum override the league standard', () => {
    const line = resolveQualifyingLine(
      group,
      'avg',
      { minStat: 'plateAppearances', minStatValue: 300 },
      pool,
    );

    expect(line).toMatchObject({ stat: 'plateAppearances', minimum: 300 });
  });

  it('takes zero as "rank everyone", not as "no override"', () => {
    expect(
      resolveQualifyingLine(
        group,
        'avg',
        { minStat: 'plateAppearances', minStatValue: 0 },
        pool,
      )?.minimum,
    ).toBe(0);
  });

  it('resolves the minimum stat loosely, as every other key is resolved', () => {
    expect(
      resolveQualifyingLine(group, 'avg', { minStat: 'PA', minStatValue: 10 }, pool)
        ?.stat,
    ).toBe('plateAppearances');
  });

  it('rejects an unknown minimum stat with the keys that would work', () => {
    expect(() =>
      resolveQualifyingLine(group, 'avg', { minStat: 'wRC' }, pool),
    ).toThrow(BadRequestException);
  });
});
