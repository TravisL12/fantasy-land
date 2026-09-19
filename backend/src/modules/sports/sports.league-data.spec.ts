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
  score: ScheduledGame['score'] = null,
): ScheduledGame => ({
  gameId: `${date}-${home}`,
  date,
  week: null,
  status: score ? 'Final' : 'Scheduled',
  home,
  away,
  probables,
  score,
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
  getTeamGames: vi.fn().mockResolvedValue([]),
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
  getHeadToHead: vi.fn().mockResolvedValue(schedule),
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

  describe('game preview', () => {
    // Which meeting is "next" is measured against today, so the clock is
    // pinned inside this season rather than left to drift past it.
    beforeEach(() => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2026-09-19T12:00:00Z'));
    });
    afterEach(() => {
      vi.useRealTimers();
    });

    const played = [
      game('2026-04-10', 'PHI', 'BOS', undefined, { home: 5, away: 2 }),
      game('2026-04-11', 'PHI', 'BOS', undefined, { home: 1, away: 3 }),
      game('2026-09-26', 'BOS', 'PHI'),
    ];

    it('returns the series record and both teams, rated as opponents', async () => {
      const provider = buildProvider();
      vi.mocked(provider.getHeadToHead).mockResolvedValue(played);
      const service = new SportsService([provider]);

      const result = await service.getGamePreview('mlb', {
        teamA: 'phi',
        teamB: 'BOS',
      });

      expect(provider.getHeadToHead).toHaveBeenCalledWith({
        season: '2026',
        teams: ['PHI', 'BOS'],
        startDate: undefined,
        endDate: undefined,
      });
      expect(result.series).toMatchObject({ played: 2, upcoming: 1 });
      expect(result.series.records[0]).toMatchObject({ team: 'PHI', wins: 1 });
      // BOS score the fewest runs, so they are the softer lineup to face.
      expect(result.teams).toMatchObject([
        { team: 'PHI', asOpponent: { pitching: { score: 25 } } },
        { team: 'BOS', asOpponent: { pitching: { score: 75 } } },
      ]);
    });

    it('previews the next unplayed meeting, not the last result', async () => {
      const provider = buildProvider();
      vi.mocked(provider.getHeadToHead).mockResolvedValue(played);
      const service = new SportsService([provider]);

      const result = await service.getGamePreview('mlb', {
        teamA: 'PHI',
        teamB: 'BOS',
      });

      expect(result.game).toMatchObject({ date: '2026-09-26', score: null });
      // The home side of that game is the one flagged as home.
      expect(result.teams.map(({ team, isHome }) => [team, isHome])).toEqual([
        ['PHI', false],
        ['BOS', true],
      ]);
    });

    /**
     * A postponed game keeps no score for ever, so "unplayed" alone would
     * preview a game called off months ago as the next meeting.
     */
    it('skips an unplayed game in the past when picking the next meeting', async () => {
      const provider = buildProvider();
      vi.mocked(provider.getHeadToHead).mockResolvedValue([
        game('2026-04-10', 'PHI', 'BOS'),
        ...played,
      ]);
      const service = new SportsService([provider]);

      const result = await service.getGamePreview('mlb', {
        teamA: 'PHI',
        teamB: 'BOS',
      });

      expect(result.game).toMatchObject({ date: '2026-09-26' });
    });

    it('falls back to the last meeting when none are left, and says so', async () => {
      const provider = buildProvider();
      vi.mocked(provider.getHeadToHead).mockResolvedValue(played.slice(0, 2));
      const service = new SportsService([provider]);

      const result = await service.getGamePreview('mlb', {
        teamA: 'PHI',
        teamB: 'BOS',
      });

      expect(result.game).toMatchObject({ date: '2026-04-11' });
      expect(result.notes.join(' ')).toMatch(/no games left/);
    });

    it('measures team stats over the interval when both dates are given', async () => {
      const provider = buildProvider();
      const service = new SportsService([provider]);

      await service.getGamePreview('mlb', {
        teamA: 'PHI',
        teamB: 'BOS',
        ...range,
      });

      expect(provider.getTeamStrength).toHaveBeenCalledWith('2026', range);
    });

    it('uses season-to-date team stats when the window is open-ended', async () => {
      const provider = buildProvider();
      const service = new SportsService([provider]);

      await service.getGamePreview('mlb', {
        teamA: 'PHI',
        teamB: 'BOS',
        startDate: range.startDate,
      });

      expect(provider.getTeamStrength).toHaveBeenCalledWith('2026', undefined);
    });

    it('says when the teams never met rather than reporting 0-0', async () => {
      const provider = buildProvider();
      vi.mocked(provider.getHeadToHead).mockResolvedValue([]);
      const service = new SportsService([provider]);

      const result = await service.getGamePreview('mlb', {
        teamA: 'PHI',
        teamB: 'BOS',
      });

      expect(result.series.played).toBe(0);
      expect(result.game).toBe(null);
    });

    it('lists the real abbreviations when one is wrong, and refuses a self-comparison', async () => {
      const service = new SportsService([buildProvider()]);

      await expect(
        service.getGamePreview('mlb', { teamA: 'PHI', teamB: 'PHILLY' }),
      ).rejects.toThrow(/BOS, PHI/);
      await expect(
        service.getGamePreview('mlb', { teamA: 'PHI', teamB: 'phi' }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  it('says so when a sport has no fixtures at all, rather than failing obscurely', async () => {
    const nfl: SportProvider = {
      key: 'nfl',
      getCatalog: vi.fn().mockResolvedValue(catalog),
      getStatLines: vi.fn(),
      getGameLog: vi.fn(),
    };
    const service = new SportsService([nfl]);

    await expect(service.getSchedule('nfl', range)).rejects.toThrow(
      /no fixture list/i,
    );
  });

  /**
   * A schedule is the narrower capability. A sport that has one but no team
   * stats must still be turned away from the views built on them — and told
   * which of the two it is missing.
   */
  it('separates missing team stats from a missing schedule', async () => {
    const fixturesOnly = {
      key: 'nfl' as const,
      getCatalog: vi.fn().mockResolvedValue(catalog),
      getStatLines: vi.fn().mockResolvedValue([]),
      getGameLog: vi.fn(),
      getSchedule: vi.fn().mockResolvedValue([]),
      getHeadToHead: vi.fn().mockResolvedValue([]),
      getTeamGames: vi.fn().mockResolvedValue([]),
    };
    const service = new SportsService([fixturesOnly]);

    await expect(service.getSchedule('nfl', range)).resolves.toMatchObject({
      games: [],
    });
    await expect(service.getProbableStarters('nfl', range)).rejects.toThrow(
      /only wired up for mlb/,
    );
  });
});
