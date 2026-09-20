import { BadRequestException } from '@nestjs/common';
import { StatsQueryDto } from './dto/stats-query.dto.js';
import { SportsService } from './sports.service.js';
import { STAT_WINDOW_KINDS } from './sports.types.js';
import type {
  SportCatalog,
  SportProvider,
  StatLine,
  WindowedStatsProvider,
} from './sports.types.js';

const qualifier = { stat: 'targets', perTeamGame: 3 };

const catalogFor = (key: string, weeks: number[] | null) =>
  ({
    key,
    defaultSeason: '2025',
    weeks,
    dataKinds: ['stats'],
    groups: [
      {
        key: 'offense',
        stats: [
          { key: 'targets', summable: true },
          { key: 'catchRate', summable: false, qualifier },
        ],
        defaultStats: ['targets'],
      },
    ],
    scoringPresets: [{ key: 'ppr', label: 'PPR', rules: { offense: {} } }],
  }) as unknown as SportCatalog;

const line = (
  name: string,
  gamesPlayed: number,
  targets: number,
  catchRate: number,
): StatLine => ({
  player: { id: name, name, team: null, position: 'WR' },
  gamesPlayed,
  stats: { targets, catchRate },
});

const seasonLines = [
  line('Starter', 17, 120, 0.6),
  line('Cameo', 1, 2, 1), // a perfect catch rate on two targets
];
const windowLines = [line('Starter', 4, 30, 0.7), line('Cameo', 1, 2, 1)];

const query = (overrides: Partial<StatsQueryDto> = {}) =>
  Object.assign(new StatsQueryDto(), overrides);

const providerFor = (
  key: string,
  weeks: number[] | null,
  windowKinds?: readonly string[],
): SportProvider => {
  const base = {
    key,
    getCatalog: vi.fn().mockResolvedValue(catalogFor(key, weeks)),
    getStatLines: vi.fn().mockResolvedValue(seasonLines),
    getGameLog: vi.fn().mockResolvedValue(null),
  };
  return windowKinds
    ? ({
        ...base,
        windowKinds,
        getWindowedStatLines: vi.fn().mockResolvedValue(windowLines),
      } as unknown as WindowedStatsProvider)
    : (base as unknown as SportProvider);
};

const serviceFor = (provider: SportProvider) =>
  new SportsService([provider] as SportProvider[]);

describe('Windowed leaderboards', () => {
  it('serves a whole season when no window is asked for', async () => {
    const provider = providerFor('nfl', [1, 2, 3, 4], [STAT_WINDOW_KINDS.weeks]);

    const result = await serviceFor(provider).getStats('nfl', query());

    expect(provider.getStatLines).toHaveBeenCalled();
    expect(result.window).toBeNull();
  });

  it('routes a week window to the capability rather than the season call', async () => {
    const provider = providerFor('nfl', [1, 2, 3, 4], [STAT_WINDOW_KINDS.weeks]);

    const result = await serviceFor(provider).getStats(
      'nfl',
      query({ weeks: [1, 2, 3, 4] }),
    );

    expect(provider.getStatLines).not.toHaveBeenCalled();
    expect(
      (provider as WindowedStatsProvider).getWindowedStatLines,
    ).toHaveBeenCalledWith(
      expect.objectContaining({ window: { weeks: [1, 2, 3, 4] } }),
    );
    expect(result.window).toEqual({ weeks: [1, 2, 3, 4] });
  });

  it('routes a date window the same way for a sport measured in dates', async () => {
    const provider = providerFor('mlb', null, [STAT_WINDOW_KINDS.dates]);

    await serviceFor(provider).getStats(
      'mlb',
      query({ startDate: '2025-08-01', endDate: '2025-08-14' }),
    );

    expect(
      (provider as WindowedStatsProvider).getWindowedStatLines,
    ).toHaveBeenCalledWith(
      expect.objectContaining({
        window: { startDate: '2025-08-01', endDate: '2025-08-14' },
      }),
    );
  });

  it('rejects dates and weeks together, which would filter each other', async () => {
    const provider = providerFor('nfl', [1, 2], [STAT_WINDOW_KINDS.weeks]);

    await expect(
      serviceFor(provider).getStats(
        'nfl',
        query({ weeks: [1], startDate: '2025-09-01' }),
      ),
    ).rejects.toThrow(BadRequestException);
  });

  it('says which terms a sport measures part-seasons in', async () => {
    const provider = providerFor('mlb', null, [STAT_WINDOW_KINDS.dates]);

    await expect(
      serviceFor(provider).getStats('mlb', query({ weeks: [1, 2] })),
    ).rejects.toThrow(/dates/);
  });

  it('says so plainly when a sport cannot window at all', async () => {
    const provider = providerFor('xfl', [1, 2]);

    await expect(
      serviceFor(provider).getStats('xfl' as never, query({ weeks: [1] })),
    ).rejects.toThrow(/whole season only/);
  });
});

describe('Qualified leaderboards', () => {
  const provider = () =>
    providerFor('nfl', [1, 2, 3, 4], [STAT_WINDOW_KINDS.weeks]);

  it('drops the small sample that would otherwise lead a rate stat', async () => {
    const result = await serviceFor(provider()).getStats(
      'nfl',
      query({ sort: 'catchRate' }),
    );

    // Cameo's perfect rate came on two targets against a 51-target line.
    expect(result.rows.map(({ player }) => player.name)).toEqual(['Starter']);
    expect(result.note).toContain('targets');
  });

  it('scales the line to the window, not to a full season', async () => {
    const result = await serviceFor(provider()).getStats(
      'nfl',
      query({ sort: 'catchRate', weeks: [1, 2, 3, 4] }),
    );

    // Four team games at three targets each: a 12-target line, not 51.
    expect(result.note).toContain('12');
    expect(result.rows.map(({ player }) => player.name)).toEqual(['Starter']);
  });

  it('leaves a counting-stat ranking unfiltered and unannotated', async () => {
    const result = await serviceFor(provider()).getStats(
      'nfl',
      query({ sort: 'targets' }),
    );

    expect(result.rows).toHaveLength(2);
    expect(result.note).toBeUndefined();
  });

  it('ranks everyone when the caller asks for no minimum', async () => {
    const result = await serviceFor(provider()).getStats(
      'nfl',
      query({ sort: 'catchRate', minStat: 'targets', minStatValue: 0 }),
    );

    expect(result.rows).toHaveLength(2);
  });
});
