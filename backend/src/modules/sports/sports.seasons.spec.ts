import { BadRequestException, NotFoundException } from '@nestjs/common';
import { SportsService } from './sports.service.js';
import type { GameLog, SportCatalog, SportProvider } from './sports.types.js';

const catalog = {
  key: 'nfl',
  defaultSeason: '2026',
  seasons: ['2026', '2025', '2024'],
  weeks: [1, 2],
  dataKinds: ['stats'],
  groups: [
    {
      key: 'offense',
      stats: [{ key: 'rec', summable: true }],
      defaultStats: ['rec'],
    },
  ],
  scoringPresets: [{ key: 'ppr', label: 'PPR', rules: { offense: { rec: 1 } } }],
} as unknown as SportCatalog;

const player = { id: '1', name: 'Alpha', team: 'DET', position: 'WR' };

const logFor = (rec: number[]): GameLog => ({
  player,
  group: 'offense',
  entries: rec.map((value, index) => ({
    date: null,
    week: index + 1,
    opponent: null,
    isHome: null,
    stats: { rec: value },
  })),
});

/** A player who did not exist before 2025. */
const seasonLogs: Record<string, GameLog | null> = {
  '2026': logFor([10, 12]),
  '2025': logFor([4, 6]),
  '2024': null,
};

const serviceFor = (logs = seasonLogs) => {
  const provider = {
    key: 'nfl',
    getCatalog: vi.fn().mockResolvedValue(catalog),
    getStatLines: vi.fn().mockResolvedValue([]),
    getGameLog: vi
      .fn()
      .mockImplementation(({ season }: { season: string }) =>
        Promise.resolve(logs[season] ?? null),
      ),
  } as unknown as SportProvider;
  return { service: new SportsService([provider]), provider };
};

describe('getPlayerSeasons', () => {
  it('returns a line per season, newest first', async () => {
    const { service } = serviceFor();

    const result = await service.getPlayerSeasons('nfl', '1', ['2025', '2026'], {});

    expect(result.seasons.map(({ season }) => season)).toEqual(['2026', '2025']);
    expect(result.seasons[0]).toMatchObject({
      season: '2026',
      gamesPlayed: 2,
      fantasyPoints: 22,
      pointsPerGame: 11,
    });
    expect(result.seasons[1].fantasyPoints).toBe(10);
  });

  it('reports a season the player has no record in rather than failing', async () => {
    const { service } = serviceFor();

    const result = await service.getPlayerSeasons(
      'nfl',
      '1',
      ['2024', '2025', '2026'],
      {},
    );

    expect(result.seasons).toHaveLength(2);
    expect(result.missing).toEqual(['2024']);
  });

  it('still fails when the player has no record in any of them', async () => {
    const { service } = serviceFor({ '2024': null, '2025': null, '2026': null });

    await expect(
      service.getPlayerSeasons('nfl', '1', ['2025', '2026'], {}),
    ).rejects.toThrow(NotFoundException);
  });

  it('defaults to the current season when none are named', async () => {
    const { service } = serviceFor();

    const result = await service.getPlayerSeasons('nfl', '1', [], {});

    expect(result.seasons.map(({ season }) => season)).toEqual(['2026']);
  });

  it('fetches each season once, however often it was listed', async () => {
    const { service, provider } = serviceFor();

    await service.getPlayerSeasons('nfl', '1', ['2026', '2026', '2025'], {});

    expect(provider.getGameLog).toHaveBeenCalledTimes(2);
  });

  it('rejects a season this sport has no data for, by name', async () => {
    const { service } = serviceFor();

    await expect(
      service.getPlayerSeasons('nfl', '1', ['2019', '2026'], {}),
    ).rejects.toThrow(/2019/);
  });

  it('caps how many seasons one request may span', async () => {
    const { service } = serviceFor();
    const tooMany = Array.from({ length: 11 }, (_, i) => String(2026 - i));

    await expect(
      service.getPlayerSeasons('nfl', '1', tooMany, {}),
    ).rejects.toThrow(BadRequestException);
  });
});
