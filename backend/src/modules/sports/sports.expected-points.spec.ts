import { BadRequestException } from '@nestjs/common';
import { SportsService } from './sports.service.js';
import type {
  OpportunityProvider,
  SportCatalog,
  SportProvider,
  StatLine,
} from './sports.types.js';

const catalog = {
  key: 'nfl',
  defaultSeason: '2025',
  weeks: [1, 2],
  dataKinds: ['stats'],
  groups: [
    { key: 'offense', stats: [{ key: 'rec', summable: true }] },
    { key: 'kicking', stats: [{ key: 'fgm', summable: true }] },
  ],
  scoringPresets: [
    { key: 'ppr', label: 'PPR', rules: { offense: { rec: 1, rec_td: 6 } } },
  ],
} as unknown as SportCatalog;

/** A league where a target is worth a point and a red zone target six. */
const line = (
  name: string,
  targets: number,
  redZone: number,
  points: number,
): StatLine => ({
  player: { id: name, name, team: 'ATL', position: 'WR' },
  gamesPlayed: 10,
  stats: { rec_tgt: targets, rec_rz_tgt: redZone, rec: points, rec_td: 0 },
});

const league = Array.from({ length: 25 }, (_, i) =>
  line(`WR${i}`, 40 + i * 2, i % 4, 40 + i * 2 + (i % 4) * 6),
);
/** Same chances as WR10, twenty points more to show for them. */
const lucky = line('Lucky', 60, 2, 60 + 12 + 20);

const provider = {
  key: 'nfl',
  opportunityStats: { offense: ['rec_tgt', 'rec_rz_tgt'] },
  getCatalog: vi.fn().mockResolvedValue(catalog),
  getStatLines: vi.fn().mockResolvedValue([...league, lucky]),
  getGameLog: vi.fn(),
} as unknown as OpportunityProvider;

describe('SportsService.getExpectedPoints', () => {
  const service = new SportsService([provider]);

  it('prices the league and ranks by expected points per game', async () => {
    const result = await service.getExpectedPoints('nfl', {});

    expect(result.scoring).toBe('ppr');
    expect(result.models[0].rSquared).toBeGreaterThan(0.9);
    const perGame = result.rows.map((row) => row.expectedPointsPerGame);
    expect(perGame).toEqual([...perGame].sort((a, b) => b - a));
  });

  it('separates the player who outscored identical opportunities', async () => {
    const result = await service.getExpectedPoints('nfl', { sort: 'delta' });

    expect(result.rows[0].player.name).toBe('Lucky');
    expect(result.rows[0].delta).toBeGreaterThan(15);
    expect(result.rows[0].efficiency).toBeGreaterThan(1);
  });

  it('filters to the players asked for, after fitting on everyone', async () => {
    const result = await service.getExpectedPoints('nfl', {
      playerIds: ['Lucky'],
    });

    expect(result.rows).toHaveLength(1);
    // The fit still saw the whole league, not the one row that came back.
    expect(result.models[0].observations).toBe(26);
  });

  it('rejects a sort key that is not a column on the board', async () => {
    await expect(
      service.getExpectedPoints('nfl', { sort: 'homeRuns' }),
    ).rejects.toThrow(BadRequestException);
  });

  it('says so for a stat group whose points are not opportunity-driven', async () => {
    await expect(
      service.getExpectedPoints('nfl', { group: 'kicking' }),
    ).rejects.toThrow(/no opportunity model/i);
  });

  it('says so for a sport with no opportunity data at all', async () => {
    const mlb = {
      key: 'mlb',
      getCatalog: vi.fn().mockResolvedValue({ ...catalog, key: 'mlb' }),
      getStatLines: vi.fn(),
      getGameLog: vi.fn(),
    } as unknown as SportProvider;

    await expect(
      new SportsService([mlb]).getExpectedPoints('mlb', {}),
    ).rejects.toThrow(/only wired up for nfl/i);
  });
});
