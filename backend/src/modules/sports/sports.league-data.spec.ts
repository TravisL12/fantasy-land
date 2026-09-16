import { BadRequestException } from '@nestjs/common';
import { SportsService } from './sports.service.js';
import type {
  LeagueDataProvider,
  MatchupMetric,
  ScheduledGame,
  SportCatalog,
  SportProvider,
} from './sports.types.js';

const catalog = {
  key: 'mlb',
  defaultSeason: '2026',
  weeks: null,
  dataKinds: ['stats'],
  groups: [
    {
      key: 'pitching',
      stats: [
        { key: 'gamesStarted', summable: true },
        { key: 'strikeOuts', summable: true },
      ],
    },
  ],
  scoringPresets: [
    { key: 'points', label: 'Points', rules: { pitching: { strikeOuts: 1 } } },
  ],
} as unknown as SportCatalog;

const game = (
  date: string,
  home: string,
  away: string,
  probables: ScheduledGame['probables'] = { home: null, away: null },
): ScheduledGame => ({
  gameId: `${date}-${home}`,
  date,
  status: 'Scheduled',
  home,
  away,
  probables,
});

const starter = (
  playerId: string,
  name: string,
  team: string,
  opponent: string,
  isHome: boolean,
) => ({ playerId, name, team, opponent, isHome });

/** PHI plays BOS on the 16th and 21st; BOS is the league's weakest lineup. */
const schedule: ScheduledGame[] = [
  game('2026-09-16', 'PHI', 'BOS', {
    home: starter('1', 'Zack Wheeler', 'PHI', 'BOS', true),
    away: null,
  }),
  game('2026-09-21', 'PHI', 'BOS'),
  game('2026-09-26', 'PHI', 'BOS'),
];

const metrics: MatchupMetric[] = [
  {
    key: 'runs',
    label: 'Runs',
    betterWhenHigh: true,
    value: ({ hitting }) => hitting.runs,
  },
];

const buildProvider = (): LeagueDataProvider => ({
  key: 'mlb',
  matchupMetrics: { pitching: metrics, hitting: metrics },
  getCatalog: vi.fn().mockResolvedValue(catalog),
  getStatLines: vi.fn().mockResolvedValue([]),
  getGameLog: vi.fn().mockResolvedValue({
    player: { id: '1', name: 'Zack Wheeler', team: 'PHI', position: 'SP' },
    group: 'pitching',
    entries: [
      {
        date: '2026-09-06',
        week: null,
        opponent: 'NYM',
        isHome: true,
        stats: { gamesStarted: 1, strikeOuts: 8 },
      },
      {
        date: '2026-09-11',
        week: null,
        opponent: 'ATL',
        isHome: false,
        stats: { gamesStarted: 1, strikeOuts: 4 },
      },
    ],
  }),
  getSchedule: vi.fn().mockResolvedValue(schedule),
  getTeamStrength: vi.fn().mockResolvedValue([
    { team: 'BOS', gamesPlayed: 150, hitting: { runs: 500 }, pitching: {} },
    { team: 'PHI', gamesPlayed: 150, hitting: { runs: 900 }, pitching: {} },
  ]),
  getPlayerStatuses: vi.fn().mockResolvedValue([
    {
      playerId: '1',
      name: 'Zack Wheeler',
      team: 'PHI',
      position: 'SP',
      status: 'Active',
      availability: 'active',
    },
    {
      playerId: '2',
      name: 'Bryce Harper',
      team: 'PHI',
      position: 'RF',
      status: 'Injured 10-Day',
      availability: 'injured',
    },
    {
      playerId: '3',
      name: 'Minor Leaguer',
      team: 'BOS',
      position: 'C',
      status: 'Reassigned to Minors',
      availability: 'minors',
    },
  ]),
});

const range = { startDate: '2026-09-16', endDate: '2026-09-22' };

describe('SportsService league data', () => {
  it('rates each announced starter against the lineup they face', async () => {
    const service = new SportsService([buildProvider()]);

    const { starters } = await service.getProbableStarters('mlb', range);

    expect(starters).toHaveLength(1);
    expect(starters[0]).toMatchObject({ name: 'Zack Wheeler', date: '2026-09-16' });
    // BOS scores the fewest runs, so facing them is the softest matchup here.
    expect(starters[0].matchup?.grade).toBe('good');
    expect(starters[0].matchup?.metrics).toEqual([
      { key: 'runs', label: 'Runs', value: 500, rank: 75 },
    ]);
  });

  it('projects a second start past the announced window and labels it', async () => {
    const service = new SportsService([buildProvider()]);

    const { pitchers } = await service.getStarts('mlb', {
      ...range,
      playerIds: ['1'],
    });

    expect(pitchers).toHaveLength(1);
    expect(pitchers[0].confirmedStarts).toBe(1);
    expect(pitchers[0].starts.map(({ date, confidence }) => [date, confidence])).toEqual(
      [
        ['2026-09-16', 'confirmed'],
        ['2026-09-21', 'projected'],
      ],
    );
  });

  it('never projects a start beyond the requested window', async () => {
    const service = new SportsService([buildProvider()]);

    const { pitchers } = await service.getStarts('mlb', {
      startDate: '2026-09-16',
      endDate: '2026-09-18',
      playerIds: ['1'],
    });

    expect(pitchers[0].starts).toHaveLength(1);
  });

  it('sweeps announced starters when no ids are given', async () => {
    const provider = buildProvider();
    const service = new SportsService([provider]);

    const { pitchers } = await service.getStarts('mlb', range);

    expect(pitchers.map(({ player }) => player.id)).toEqual(['1']);
    // The sweep must not cost a game-log fetch per pitcher.
    expect(provider.getGameLog).not.toHaveBeenCalled();
  });

  it('ranks teams by how soft they are to face', async () => {
    const service = new SportsService([buildProvider()]);

    const { teams } = await service.getMatchupBoard('mlb', 'pitching');

    expect(teams.map(({ team }) => team)).toEqual(['BOS', 'PHI']);
    expect(teams[0].score).toBeGreaterThan(teams[1].score);
  });

  it('filters availability, team and name together', async () => {
    const service = new SportsService([buildProvider()]);

    const { players } = await service.getPlayerStatuses('mlb', {
      availability: ['injured'],
      team: 'phi',
    });

    expect(players.map(({ name }) => name)).toEqual(['Bryce Harper']);
  });

  it('returns every availability when none is requested', async () => {
    const service = new SportsService([buildProvider()]);

    const { players } = await service.getPlayerStatuses('mlb', {});

    expect(players).toHaveLength(3);
  });

  it('compares a recent split with the season', async () => {
    const service = new SportsService([buildProvider()]);

    const { form } = await service.getPlayerForm('mlb', '1', { window: 1 });

    expect(form.recent.average).toBe(4);
    expect(form.season.average).toBe(6);
    expect(form.trend).toBe('cold');
    expect(form.recentTotals).toEqual({ gamesStarted: 1, strikeOuts: 4 });
  });

  it('rejects a window longer than the cap', async () => {
    const service = new SportsService([buildProvider()]);

    await expect(
      service.getProbableStarters('mlb', {
        startDate: '2026-09-01',
        endDate: '2026-10-30',
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it('rejects a malformed date rather than querying upstream', async () => {
    const provider = buildProvider();
    const service = new SportsService([provider]);

    await expect(
      service.getProbableStarters('mlb', { startDate: 'tomorrow' }),
    ).rejects.toThrow(BadRequestException);
    expect(provider.getSchedule).not.toHaveBeenCalled();
  });

  it('says so when a sport has no schedule data instead of failing obscurely', async () => {
    const nfl: SportProvider = {
      key: 'nfl',
      getCatalog: vi.fn().mockResolvedValue(catalog),
      getStatLines: vi.fn(),
      getGameLog: vi.fn(),
    };
    const service = new SportsService([nfl]);

    await expect(service.getProbableStarters('nfl', range)).rejects.toThrow(
      /only wired up for mlb/,
    );
  });
});
