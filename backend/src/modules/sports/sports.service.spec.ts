import { BadRequestException, NotFoundException } from '@nestjs/common';
import { StatsQueryDto } from './dto/stats-query.dto.js';
import { SportsService } from './sports.service.js';
import type { SportCatalog, SportProvider, StatLine } from './sports.types.js';

const catalog = {
  key: 'nfl',
  defaultSeason: '2025',
  weeks: [1, 2],
  dataKinds: ['stats'],
  groups: [{ key: 'offense', stats: [{ key: 'rec', summable: true }] }],
  scoringPresets: [
    { key: 'ppr', label: 'PPR', rules: { offense: { rec: 1, rec_td: 6 } } },
    { key: 'std', label: 'Std', rules: { offense: { rec_td: 6 } } },
  ],
} as unknown as SportCatalog;

const line = (
  name: string,
  position: string,
  gamesPlayed: number,
  rec: number,
  rec_td: number,
): StatLine => ({
  player: { id: name, name, team: null, position },
  gamesPlayed,
  stats: { rec, rec_td },
});

const lines = [
  line('Alpha', 'WR', 10, 50, 2), // ppr 62
  line('Bravo', 'TE', 5, 20, 5), // ppr 50
  line('Charlie', 'WR', 2, 90, 0), // ppr 90
];

const query = (overrides: Partial<StatsQueryDto> = {}) =>
  Object.assign(new StatsQueryDto(), overrides);

describe('SportsService', () => {
  const provider: SportProvider = {
    key: 'nfl',
    getCatalog: vi.fn().mockResolvedValue(catalog),
    getStatLines: vi.fn().mockResolvedValue(lines),
    getGameLog: vi.fn().mockResolvedValue({
      player: { id: 'Alpha', name: 'Alpha', team: null, position: 'WR' },
      group: 'offense',
      entries: [
        {
          date: null,
          week: 1,
          opponent: null,
          isHome: null,
          stats: { rec: 5, rec_td: 1 },
        },
        {
          date: null,
          week: 2,
          opponent: null,
          isHome: null,
          stats: { rec: 3, rec_td: 0 },
        },
      ],
    }),
  };
  const service = new SportsService([provider]);

  it('scores and sorts by fantasy points by default', async () => {
    const result = await service.getStats('nfl', query());

    expect(result.rows.map((r) => [r.player.name, r.fantasyPoints])).toEqual([
      ['Charlie', 90],
      ['Alpha', 62],
      ['Bravo', 50],
    ]);
    expect(result).toMatchObject({ season: '2025', scoring: 'ppr', total: 3 });
  });

  it('filters, re-scores and sorts by a raw stat', async () => {
    const result = await service.getStats(
      'nfl',
      query({
        position: 'WR',
        minGames: 5,
        scoring: 'std',
        sort: 'rec',
        order: 'asc',
      }),
    );

    expect(result.rows).toHaveLength(1);
    expect(result.rows[0]).toMatchObject({
      fantasyPoints: 12,
      fantasyPointsPerGame: 1.2,
    });
  });

  it('paginates after sorting', async () => {
    const result = await service.getStats(
      'nfl',
      query({ sort: 'fantasyPointsPerGame', limit: 1, offset: 1 }),
    );
    expect(result.total).toBe(3);
    expect(result.rows.map((r) => r.player.name)).toEqual(['Bravo']);
  });

  it('rejects unknown groups and scoring presets', async () => {
    await expect(
      service.getStats('nfl', query({ group: 'nope' })),
    ).rejects.toBeInstanceOf(BadRequestException);
    await expect(
      service.getStats('nfl', query({ scoring: 'nope' })),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('summarizes a player game log', async () => {
    const result = await service.getPlayerStats('nfl', 'Alpha', {});

    expect(result.entries.map((e) => e.fantasyPoints)).toEqual([11, 3]);
    expect(result.totals).toEqual({ rec: 8 });
    expect(result.summary).toMatchObject({
      games: 2,
      total: 14,
      average: 7,
      floor: 3,
      ceiling: 11,
    });
  });

  it('404s when the provider has no such player', async () => {
    vi.mocked(provider.getGameLog).mockResolvedValueOnce(null);
    await expect(
      service.getPlayerStats('nfl', 'ghost', {}),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});
