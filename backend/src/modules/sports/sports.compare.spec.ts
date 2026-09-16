import { BadRequestException } from '@nestjs/common';
import { SportsService } from './sports.service.js';
import type { GameLogQuery, SportCatalog, SportProvider } from './sports.types.js';

const catalog = {
  key: 'nfl',
  defaultSeason: '2025',
  weeks: [1, 2, 3],
  dataKinds: ['stats'],
  groups: [
    {
      key: 'offense',
      stats: [{ key: 'rec', summable: true }],
    },
  ],
  scoringPresets: [
    { key: 'ppr', label: 'PPR', rules: { offense: { rec: 1 } } },
  ],
} as unknown as SportCatalog;

const entry = (week: number, rec: number, date: string | null = null) => ({
  date,
  week,
  opponent: null,
  isHome: null,
  stats: { rec },
});

/** Alpha starts hot and fades; Bravo does the opposite. */
const logs: Record<string, { week: number; rec: number }[]> = {
  Alpha: [
    { week: 1, rec: 12 },
    { week: 2, rec: 10 },
    { week: 3, rec: 2 },
  ],
  Bravo: [
    { week: 1, rec: 4 },
    { week: 2, rec: 3 },
    { week: 3, rec: 9 },
  ],
};

const provider: SportProvider = {
  key: 'nfl',
  getCatalog: vi.fn().mockResolvedValue(catalog),
  getStatLines: vi.fn().mockResolvedValue([]),
  getGameLog: vi.fn(async ({ playerId }: GameLogQuery) => ({
    player: { id: playerId, name: playerId, team: null, position: 'WR' },
    group: 'offense',
    entries: (logs[playerId] ?? []).map(({ week, rec }) => entry(week, rec)),
  })),
};

const service = new SportsService([provider]);

describe('SportsService.comparePlayers', () => {
  it('puts both players on the same scoring and names the leader', async () => {
    const result = await service.comparePlayers('nfl', ['Alpha', 'Bravo'], {});

    expect(result.players.map(({ name, fantasyPoints }) => [name, fantasyPoints]))
      .toEqual([
        ['Alpha', 24],
        ['Bravo', 16],
      ]);
    expect(result.bestPointsPerGame).toBe('Alpha');
    expect(result.players[0]).toMatchObject({ games: 3, totals: { rec: 24 } });
  });

  it('measures only the games inside the window', async () => {
    const result = await service.comparePlayers('nfl', ['Alpha', 'Bravo'], {
      window: { weeks: [3] },
    });

    expect(result.players.map(({ name, games, pointsPerGame }) => [
      name,
      games,
      pointsPerGame,
    ])).toEqual([
      ['Alpha', 1, 2],
      ['Bravo', 1, 9],
    ]);
    // The season leader is not the leader over the window — the whole point.
    expect(result.bestPointsPerGame).toBe('Bravo');
  });

  it('applies lastN to the recent end of the log', async () => {
    const result = await service.comparePlayers('nfl', ['Alpha', 'Bravo'], {
      window: { lastN: 2 },
    });

    expect(result.players[0]).toMatchObject({ games: 2, fantasyPoints: 12 });
    expect(result.window).toMatchObject({ lastN: 2 });
  });

  it('reports the head-to-head over the games they both played', async () => {
    const { headToHead } = await service.comparePlayers(
      'nfl',
      ['Alpha', 'Bravo'],
      {},
    );

    expect(headToHead.sharedGames).toBe(3);
    expect(headToHead.leader).toBe('Alpha');
    expect(headToHead.records[0]).toMatchObject({ wins: 2, averageMargin: 2.67 });
  });

  it('says so rather than returning a silent zero when nothing is in range', async () => {
    const result = await service.comparePlayers('nfl', ['Alpha', 'Bravo'], {
      window: { weeks: [9] },
    });

    expect(result.players.every(({ games }) => games === 0)).toBe(true);
    expect(result.notes).toContainEqual(expect.stringContaining('No games'));
  });

  // NFL logs carry weeks, not dates, so a date window would empty the result.
  it('ignores a date window a dateless log cannot answer, and says it did', async () => {
    const result = await service.comparePlayers('nfl', ['Alpha', 'Bravo'], {
      window: { startDate: '2025-09-01', endDate: '2025-09-30' },
    });

    expect(result.players[0].games).toBe(3);
    expect(result.notes).toContainEqual(expect.stringContaining('no dates'));
  });

  it('rejects a malformed or backwards date window', async () => {
    await expect(
      service.comparePlayers('nfl', ['Alpha', 'Bravo'], {
        window: { startDate: 'last month' },
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
    await expect(
      service.comparePlayers('nfl', ['Alpha', 'Bravo'], {
        window: { startDate: '2025-10-01', endDate: '2025-09-01' },
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});
