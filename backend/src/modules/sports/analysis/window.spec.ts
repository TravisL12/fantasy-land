import { datesUnusable, sliceGames, venueUnusable } from './window.js';

const dated = [
  { date: '2026-07-01', week: null },
  { date: '2026-07-15', week: null },
  { date: '2026-08-02', week: null },
  { date: '2026-08-20', week: null },
];

const weekly = [
  { date: null, week: 1 },
  { date: null, week: 2 },
  { date: null, week: 3 },
];

describe('sliceGames', () => {
  it('keeps everything when the window is empty', () => {
    expect(sliceGames(dated, {})).toEqual(dated);
  });

  it('includes both ends of a date range', () => {
    expect(
      sliceGames(dated, { startDate: '2026-07-15', endDate: '2026-08-02' }).map(
        ({ date }) => date,
      ),
    ).toEqual(['2026-07-15', '2026-08-02']);
  });

  it('filters by week for sports that have them', () => {
    expect(sliceGames(weekly, { weeks: [1, 3] }).map(({ week }) => week)).toEqual(
      [1, 3],
    );
  });

  it('applies lastN after the filters, not before', () => {
    const result = sliceGames(dated, { endDate: '2026-08-02', lastN: 2 });

    expect(result.map(({ date }) => date)).toEqual([
      '2026-07-15',
      '2026-08-02',
    ]);
  });

  // A dateless log would otherwise come back empty and read as "no games".
  it('ignores a date window when no game in the log has a date', () => {
    const window = { startDate: '2026-07-01', endDate: '2026-07-31' };

    expect(datesUnusable(weekly, window)).toBe(true);
    expect(sliceGames(weekly, window)).toEqual(weekly);
    expect(sliceGames(weekly, { ...window, weeks: [2] })).toEqual([weekly[1]]);
  });

  it('still drops an undated game from a log that mostly has dates', () => {
    const mixed = [...dated, { date: null, week: null }];

    expect(datesUnusable(mixed, { startDate: '2026-07-01' })).toBe(false);
    expect(sliceGames(mixed, { startDate: '2026-07-01' })).toEqual(dated);
  });
});

describe('sliceGames splits', () => {
  const game = (
    week: number,
    opponent: string | null,
    isHome: boolean | null,
  ) => ({ date: null, week, opponent, isHome });

  const log = [
    game(1, 'KC', true),
    game(2, 'BUF', false),
    game(3, 'KC', false),
    game(4, 'MIA', true),
  ];

  it('splits home from away', () => {
    expect(sliceGames(log, { venue: 'home' }).map(({ week }) => week)).toEqual([
      1, 4,
    ]);
    expect(sliceGames(log, { venue: 'away' }).map(({ week }) => week)).toEqual([
      2, 3,
    ]);
  });

  it('narrows to one opponent, whatever the casing', () => {
    expect(sliceGames(log, { opponent: 'kc' }).map(({ week }) => week)).toEqual([
      1, 3,
    ]);
  });

  it('combines a split with the rest of the window', () => {
    expect(
      sliceGames(log, { opponent: 'KC', venue: 'away' }).map(({ week }) => week),
    ).toEqual([3]);
  });

  it('applies lastN after the split, not before', () => {
    // The last away game, not "the last game, if it was away".
    expect(
      sliceGames(log, { venue: 'away', lastN: 1 }).map(({ week }) => week),
    ).toEqual([3]);
  });

  it('ignores a venue split the log cannot answer rather than emptying it', () => {
    const undated = [game(1, 'KC', null), game(2, 'BUF', null)];

    expect(sliceGames(undated, { venue: 'home' })).toHaveLength(2);
    expect(venueUnusable(undated, { venue: 'home' })).toBe(true);
  });

  it('still filters by venue when only some games say', () => {
    const partial = [game(1, 'KC', true), game(2, 'BUF', null)];

    expect(sliceGames(partial, { venue: 'home' }).map(({ week }) => week)).toEqual(
      [1],
    );
  });

  it('returns nothing for an opponent never faced', () => {
    expect(sliceGames(log, { opponent: 'NYJ' })).toEqual([]);
  });
});
