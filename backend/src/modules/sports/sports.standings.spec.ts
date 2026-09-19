import { BadRequestException } from '@nestjs/common';
import { SportsService } from './sports.service.js';
import type {
  SportCatalog,
  SportProvider,
  StandingsEntry,
  StandingsGroup,
} from './sports.types.js';

const catalog = {
  key: 'nfl',
  defaultSeason: '2026',
  weeks: [1, 2],
  dataKinds: ['stats'],
  groups: [{ key: 'offense', stats: [], defaultStats: [] }],
  scoringPresets: [{ key: 'ppr', label: 'PPR', rules: {} }],
} as unknown as SportCatalog;

const entry = (
  team: string,
  wins: number,
  losses: number,
  overrides: Partial<StandingsEntry> = {},
): StandingsEntry => ({
  team,
  name: team,
  wins,
  losses,
  ties: 0,
  winPct: wins / Math.max(1, wins + losses),
  gamesPlayed: wins + losses,
  gamesRemaining: 17 - (wins + losses),
  gamesBack: null,
  scoredFor: 0,
  scoredAgainst: 0,
  streak: null,
  rank: 1,
  playoffSeed: null,
  clinch: 'contending',
  clinchNote: null,
  magicNumber: null,
  eliminationNumber: null,
  wildCard: null,
  ...overrides,
});

const groups: StandingsGroup[] = [
  {
    key: 'AFC East',
    name: 'AFC East',
    conference: 'AFC',
    teams: [entry('BUF', 14, 1), entry('NYJ', 4, 11)],
  },
  {
    key: 'NFC East',
    name: 'NFC East',
    conference: 'NFC',
    teams: [entry('PHI', 9, 6), entry('DAL', 8, 7)],
  },
];

const buildProvider = (standings = groups) => ({
  key: 'nfl' as const,
  getCatalog: vi.fn().mockResolvedValue(catalog),
  getStatLines: vi.fn().mockResolvedValue([]),
  getGameLog: vi.fn(),
  getStandings: vi.fn().mockResolvedValue(standings),
});

describe('SportsService standings', () => {
  it('computes the clinch numbers a league does not publish, and says so', async () => {
    const service = new SportsService([buildProvider()]);

    const table = await service.getStandings('nfl');

    expect(table.groups[0].teams[0]).toMatchObject({
      team: 'BUF',
      magicNumber: 0,
      clinch: 'clinched',
    });
    expect(table.method).toMatch(/computed/);
  });

  /**
   * A league that publishes its own figures is the authority on them, and the
   * method note has to say so — a reader weighs a league's magic number
   * differently from one we worked out.
   */
  it('passes published numbers through untouched', async () => {
    const published = [
      {
        ...groups[0],
        teams: [
          entry('BUF', 14, 1, { magicNumber: 3, eliminationNumber: 5 }),
          entry('NYJ', 4, 11),
        ],
      },
    ];
    const service = new SportsService([buildProvider(published)]);

    const table = await service.getStandings('nfl');

    expect(table.groups[0].teams[0]).toMatchObject({
      magicNumber: 3,
      eliminationNumber: 5,
    });
    expect(table.method).toMatch(/league's own/);
  });

  it('narrows to one division or a whole conference', async () => {
    const service = new SportsService([buildProvider()]);

    await expect(
      service.getStandings('nfl', { group: 'afc east' }),
    ).resolves.toMatchObject({ groups: [{ key: 'AFC East' }] });
    await expect(
      service.getStandings('nfl', { group: 'NFC' }),
    ).resolves.toMatchObject({ groups: [{ key: 'NFC East' }] });
  });

  /** An empty table reads as "nobody is in that division", which is a lie. */
  it('lists the real groups when the name is wrong', async () => {
    const service = new SportsService([buildProvider()]);

    await expect(service.getStandings('nfl', { group: 'AL East' })).rejects.toThrow(
      /AFC East/,
    );
  });

  it('says so when a sport publishes no table', async () => {
    const bare: SportProvider = {
      key: 'nfl',
      getCatalog: vi.fn().mockResolvedValue(catalog),
      getStatLines: vi.fn(),
      getGameLog: vi.fn(),
    };
    const service = new SportsService([bare]);

    await expect(service.getStandings('nfl')).rejects.toThrow(
      BadRequestException,
    );
  });
});
