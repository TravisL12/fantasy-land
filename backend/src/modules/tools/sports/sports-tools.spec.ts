import { BadRequestException, NotFoundException } from '@nestjs/common';
import type {
  PlayerStatsResponseDto,
  StatsResponseDto,
} from '../../sports/dto/stats-response.dto.js';
import { WINDOW_DEFAULTS } from '../../sports/sports.constants.js';
import type { SportsService } from '../../sports/sports.service.js';
import { ComparePlayersTool } from './compare-players.tool.js';
import { FindPlayerTool } from './find-player.tool.js';
import { GamePreviewTool } from './game-preview.tool.js';
import { ScheduleTool } from './schedule.tool.js';
import { StandingsTool } from './standings.tool.js';
import { LeaderboardTool } from './leaderboard.tool.js';
import { PlayerStatsTool } from './player-stats.tool.js';
import {
  GAME_LOG_LIMIT,
  LEADERBOARD_LIMIT,
  SCHEDULE_LIMIT,
} from './sports-tools.constants.js';

const vele = { id: '11834', name: 'Devaughn Vele', team: 'NO', position: 'WR' };

const statsResponse: StatsResponseDto = {
  sport: 'nfl',
  season: '2025',
  week: null,
  group: 'offense',
  kind: 'stats',
  scoring: 'ppr',
  total: 1,
  rows: [
    {
      player: vele,
      gamesPlayed: 13,
      stats: { rec: 25, rec_yd: 293 },
      fantasyPoints: 66.3,
      fantasyPointsPerGame: 5.1,
    },
  ],
};

const playerStatsResponse: PlayerStatsResponseDto = {
  sport: 'nfl',
  season: '2025',
  group: 'offense',
  scoring: 'ppr',
  player: vele,
  entries: Array.from({ length: 13 }, (_, i) => ({
    week: i + 1,
    date: null,
    opponent: 'TB',
    isHome: true,
    stats: { rec: 2 },
    fantasyPoints: i,
  })),
  totals: { rec: 25, rec_yd: 293 },
  summary: {
    games: 13,
    total: 66.3,
    average: 5.1,
    median: 4.8,
    stdDev: 3.2,
    floor: 0,
    ceiling: 12.4,
  },
};

const RECEIVING = [
  { key: 'rec', label: 'Receptions', abbr: 'REC' },
  { key: 'rec_yd', label: 'Receiving yards', abbr: 'REC YD' },
];

const sportsStub = (
  groups: {
    key: string;
    stats?: { key: string; label?: string; abbr?: string }[];
    defaultStats?: string[];
  }[] = [
    {
      key: 'offense',
      stats: RECEIVING,
      defaultStats: ['rec', 'rec_yd'],
    },
  ],
) =>
  ({
    getStats: vi.fn().mockResolvedValue(statsResponse),
    searchPlayerDirectory: vi.fn().mockResolvedValue([]),
    getPlayerStats: vi.fn().mockResolvedValue(playerStatsResponse),
    getCatalog: vi.fn().mockResolvedValue({
      groups: groups.map((group) => ({
        stats: [],
        defaultStats: [],
        ...group,
      })),
    }),
  }) as unknown as SportsService;

describe('sports tools', () => {
  describe('find_player', () => {
    it('searches by name and returns ids', async () => {
      const sports = sportsStub();
      const result = await new FindPlayerTool(sports).execute({ query: 'vele' });

      expect(result).toEqual({
        sport: 'nfl',
        season: '2025',
        players: [{ ...vele, group: 'offense', gamesPlayed: 13 }],
      });
      expect(vi.mocked(sports.getStats)).toHaveBeenCalledWith(
        'nfl',
        expect.objectContaining({ search: 'vele' }),
      );
    });

    it('falls back to the league directory for a player with no stats yet', async () => {
      const sports = sportsStub();
      vi.mocked(sports.getStats).mockResolvedValue({
        ...statsResponse,
        rows: [],
      });
      vi.mocked(sports.searchPlayerDirectory).mockResolvedValue([
        {
          id: '12345',
          name: 'Rookie Receiver',
          team: 'CLE',
          position: 'WR',
          group: 'offense',
          status: 'Active',
          availability: 'active',
          rank: 180,
        },
      ]);

      const result = await new FindPlayerTool(sports).execute({
        query: 'rookie',
      });

      expect(result.players).toEqual([
        {
          id: '12345',
          name: 'Rookie Receiver',
          team: 'CLE',
          position: 'WR',
          group: 'offense',
          status: 'Active',
          availability: 'active',
          gamesPlayed: 0,
        },
      ]);
    });

    it('puts players who have actually played ahead of directory-only ones', async () => {
      const sports = sportsStub();
      vi.mocked(sports.searchPlayerDirectory).mockResolvedValue([
        {
          id: '12345',
          name: 'Devaughn Velez',
          team: 'CLE',
          position: 'WR',
          group: 'offense',
          status: 'Active',
          availability: 'active',
          rank: 1,
        },
      ]);

      const result = await new FindPlayerTool(sports).execute({
        query: 'vele',
      });

      expect(result.players.map(({ name }) => name)).toEqual([
        'Devaughn Vele',
        'Devaughn Velez',
      ]);
    });

    it('does not list a player twice when both sources know them', async () => {
      const sports = sportsStub();
      vi.mocked(sports.searchPlayerDirectory).mockResolvedValue([
        {
          ...vele,
          group: 'offense',
          status: 'Active',
          availability: 'active',
          rank: 90,
        },
      ]);

      const result = await new FindPlayerTool(sports).execute({
        query: 'vele',
      });

      expect(result.players).toHaveLength(1);
      expect(result.players[0].gamesPlayed).toBe(13);
    });

    it('tells the model when nothing matched', async () => {
      const sports = sportsStub();
      vi.mocked(sports.getStats).mockResolvedValue({ ...statsResponse, rows: [] });

      await expect(
        new FindPlayerTool(sports).execute({ query: 'nobody' }),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('searches every stat group, so a pitcher is not hidden behind hitting', async () => {
      const sports = sportsStub([{ key: 'hitting' }, { key: 'pitching' }]);
      vi.mocked(sports.getStats).mockImplementation(async (_sport, query) =>
        query.group === 'pitching'
          ? { ...statsResponse, group: 'pitching' }
          : { ...statsResponse, group: 'hitting', rows: [] },
      );

      const result = await new FindPlayerTool(sports).execute({
        sport: 'mlb',
        query: 'skubal',
      });

      expect(result.players).toEqual([
        { ...vele, group: 'pitching', gamesPlayed: 13 },
      ]);
    });

    it('returns a player found in two groups only once', async () => {
      const sports = sportsStub([{ key: 'hitting' }, { key: 'pitching' }]);
      vi.mocked(sports.getStats).mockImplementation(async (_sport, query) => ({
        ...statsResponse,
        group: query.group as string,
        rows: [
          {
            ...statsResponse.rows[0],
            gamesPlayed: query.group === 'hitting' ? 134 : 20,
          },
        ],
      }));

      const result = await new FindPlayerTool(sports).execute({
        sport: 'mlb',
        query: 'ohtani',
      });

      // The busier line wins, so a two-way player lands in the group that matters.
      expect(result.players).toEqual([
        { ...vele, group: 'hitting', gamesPlayed: 134 },
      ]);
    });

    it('rejects an unknown sport rather than defaulting silently', async () => {
      await expect(
        new FindPlayerTool(sportsStub()).execute({ query: 'x', sport: 'cricket' }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });
  });

  describe('get_player_stats', () => {
    it('returns totals and consistency, without the game log, by default', async () => {
      const result = await new PlayerStatsTool(sportsStub()).execute({
        playerId: '11834',
      });

      expect(result).toMatchObject({
        player: vele,
        totals: { rec: 25, rec_yd: 293 },
        fantasyPoints: 66.3,
        pointsPerGame: 5.1,
      });
      expect(result).not.toHaveProperty('games');
      expect(result).not.toHaveProperty('form');
    });

    // fantasyPoints and pointsPerGame are these two numbers; a second copy
    // inside consistency reads to a model as a second measurement.
    it('does not repeat the headline numbers inside consistency', async () => {
      const result = (await new PlayerStatsTool(sportsStub()).execute({
        playerId: '11834',
      })) as { consistency: Record<string, number> };

      expect(result.consistency).not.toHaveProperty('total');
      expect(result.consistency).not.toHaveProperty('average');
      expect(result.consistency).toMatchObject({ floor: 0, ceiling: 12.4 });
    });

    it('adds the game log only when asked, and caps it', async () => {
      const result = (await new PlayerStatsTool(sportsStub()).execute({
        playerId: '11834',
        include: ['games'],
        lastN: 3,
      })) as { games: { week: number }[] };

      expect(result.games.map((game) => game.week)).toEqual([11, 12, 13]);
    });

    it('coerces a stringified number, as small models often send', async () => {
      const result = (await new PlayerStatsTool(sportsStub()).execute({
        playerId: '11834',
        include: 'games',
        lastN: '2',
      })) as { games: unknown[] };

      expect(result.games).toHaveLength(2);
    });

    it('keeps a chat game log short and gives a dashboard the whole thing', async () => {
      const tool = new PlayerStatsTool(sportsStub());

      const chat = (await tool.execute({
        playerId: '11834',
        include: ['games'],
      })) as { games: unknown[] };
      expect(chat.games).toHaveLength(GAME_LOG_LIMIT.default);

      const dashboard = (await tool.execute(
        { playerId: '11834', include: ['games'] },
        { full: true },
      )) as { games: unknown[] };
      expect(dashboard.games).toHaveLength(13);
    });

    it('measures form against the season when asked for it', async () => {
      const result = (await new PlayerStatsTool(sportsStub()).execute({
        playerId: '11834',
        include: ['form'],
      })) as { form: { window: number; recent: { average: number }; trend: string } };

      // The splits keep their own average — the trend is the difference.
      expect(result.form.recent.average).toEqual(expect.any(Number));
      expect(result.form.trend).toEqual(expect.any(String));
    });

    it('rejects an include value it does not have a section for', async () => {
      await expect(
        new PlayerStatsTool(sportsStub()).execute({
          playerId: '11834',
          include: ['projections'],
        }),
      ).rejects.toThrow(/Unknown "include" value "projections"/);
    });

    it('requires a player id', async () => {
      await expect(
        new PlayerStatsTool(sportsStub()).execute({}),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('narrows the stats to the keys asked for', async () => {
      const result = (await new PlayerStatsTool(sportsStub()).execute({
        playerId: '11834',
        stats: ['rec_yd'],
      })) as { totals: Record<string, number> };

      expect(result.totals).toEqual({ rec_yd: 293 });
    });

    it('names the valid keys when asked for a stat the group has no such thing as', async () => {
      await expect(
        new PlayerStatsTool(sportsStub()).execute({
          playerId: '11834',
          stats: ['touchdowns'],
        }),
      ).rejects.toThrow(/Unknown stat key "touchdowns"/);
    });
  });

  describe('get_leaderboard', () => {
    it('caps the limit so a big request cannot flood the context', async () => {
      const sports = sportsStub();
      await new LeaderboardTool(sports).execute({ limit: 500 });

      expect(vi.mocked(sports.getStats)).toHaveBeenCalledWith(
        'nfl',
        expect.objectContaining({ limit: LEADERBOARD_LIMIT.max }),
      );
    });

    it('rejects a sort key the group does not define', async () => {
      const sports = sportsStub();

      // A bad key would otherwise sort alphabetically and look like a ranking.
      await expect(
        new LeaderboardTool(sports).execute({ sort: 'stats.rec' }),
      ).rejects.toThrow(/Cannot sort by "stats.rec"/);
      expect(vi.mocked(sports.getStats)).not.toHaveBeenCalled();
    });

    it('accepts a stat key and a computed key', async () => {
      const sports = sportsStub();

      await new LeaderboardTool(sports).execute({ sort: 'rec_yd' });
      await new LeaderboardTool(sports).execute({ sort: 'fantasyPointsPerGame' });

      expect(vi.mocked(sports.getStats)).toHaveBeenCalledTimes(2);
    });

    // A model writes the stat the way it reads, not the way upstream spells it.
    it('sorts by a loosely named stat, passing the real key on', async () => {
      const sports = sportsStub();

      await new LeaderboardTool(sports).execute({ sort: 'receiving yards' });
      await new LeaderboardTool(sports).execute({ sort: 'fantasy_points' });

      expect(vi.mocked(sports.getStats)).toHaveBeenNthCalledWith(
        1,
        'nfl',
        expect.objectContaining({ sort: 'rec_yd' }),
      );
      expect(vi.mocked(sports.getStats)).toHaveBeenNthCalledWith(
        2,
        'nfl',
        expect.objectContaining({ sort: 'fantasyPoints' }),
      );
    });

    it('returns only the group\'s headline stats to a chat turn', async () => {
      const sports = sportsStub([
        {
          key: 'offense',
          stats: [{ key: 'rec' }, { key: 'rec_yd' }],
          defaultStats: ['rec'],
        },
      ]);

      const result = (await new LeaderboardTool(sports).execute({})) as {
        rows: { stats: Record<string, number> }[];
      };

      expect(result.rows[0].stats).toEqual({ rec: 25 });
    });

    it('gives a dashboard every stat, since it renders them', async () => {
      const sports = sportsStub([
        {
          key: 'offense',
          stats: [{ key: 'rec' }, { key: 'rec_yd' }],
          defaultStats: ['rec'],
        },
      ]);

      const result = (await new LeaderboardTool(sports).execute(
        {},
        { full: true },
      )) as { rows: { stats: Record<string, number> }[] };

      expect(result.rows[0].stats).toEqual({ rec: 25, rec_yd: 293 });
    });

    it('keeps a loosely named stat filter, under the real key', async () => {
      const sports = sportsStub([
        { key: 'offense', stats: RECEIVING, defaultStats: ['rec'] },
      ]);

      const result = (await new LeaderboardTool(sports).execute({
        stats: ['REC YD'],
      })) as { rows: { stats: Record<string, number> }[] };

      expect(result.rows[0].stats).toEqual({ rec_yd: 293 });
    });

    it('still names the valid keys when a stat resolves to nothing', async () => {
      const sports = sportsStub();

      await expect(
        new LeaderboardTool(sports).execute({ stats: ['strikeouts'] }),
      ).rejects.toThrow(/Valid keys: rec, rec_yd/);
    });

    // A top ten by receiving yards with no receiving yards in it is unusable.
    it('keeps the column it ranked by even when it is outside the defaults', async () => {
      const sports = sportsStub([
        {
          key: 'offense',
          stats: [{ key: 'rec' }, { key: 'rec_yd' }],
          defaultStats: ['rec'],
        },
      ]);

      const result = (await new LeaderboardTool(sports).execute({
        sort: 'rec_yd',
      })) as { rows: { stats: Record<string, number> }[] };

      expect(result.rows[0].stats).toEqual({ rec: 25, rec_yd: 293 });
    });

    it('drops the internal "kind" field the model has no use for', async () => {
      const result = await new LeaderboardTool(sportsStub()).execute({});

      expect(result).not.toHaveProperty('kind');
    });

    it('passes filters through and flattens the rows', async () => {
      const sports = sportsStub();
      const result = (await new LeaderboardTool(sports).execute({
        position: 'WR',
        week: 2,
        scoring: 'ppr',
      })) as { rows: { name: string; fantasyPoints: number }[] };

      expect(vi.mocked(sports.getStats)).toHaveBeenCalledWith(
        'nfl',
        expect.objectContaining({ position: 'WR', week: 2, scoring: 'ppr' }),
      );
      expect(result.rows[0]).toMatchObject({
        name: 'Devaughn Vele',
        fantasyPoints: 66.3,
      });
    });
  });

  describe('compare_players', () => {
    const comparison = {
      sport: 'nfl',
      players: [],
      bestPointsPerGame: 'Devaughn Vele',
      headToHead: { sharedGames: 0, records: [], leader: null, games: [] },
    };

    const compareStub = () =>
      ({
        comparePlayers: vi.fn().mockResolvedValue(comparison),
        getCatalog: vi.fn().mockResolvedValue({ groups: [] }),
      }) as unknown as SportsService;

    it('passes the players and scoring through to the comparison', async () => {
      const sports = compareStub();
      const result = await new ComparePlayersTool(sports).execute({
        playerIds: ['11834', '9509'],
        scoring: 'ppr',
      });

      expect(result).toMatchObject({ bestPointsPerGame: 'Devaughn Vele' });
      expect(vi.mocked(sports.comparePlayers)).toHaveBeenCalledWith(
        'nfl',
        ['11834', '9509'],
        expect.objectContaining({ scoring: 'ppr' }),
      );
    });

    it('turns the interval arguments into a window', async () => {
      const sports = compareStub();
      await new ComparePlayersTool(sports).execute({
        playerIds: ['11834', '9509'],
        startDate: '2025-09-01',
        endDate: '2025-10-01',
        // Small models send numbers as strings and a lone value for an array.
        weeks: '3',
        lastN: '4',
      });

      expect(vi.mocked(sports.comparePlayers)).toHaveBeenCalledWith(
        'nfl',
        ['11834', '9509'],
        expect.objectContaining({
          window: {
            startDate: '2025-09-01',
            endDate: '2025-10-01',
            weeks: [3],
            lastN: 4,
          },
        }),
      );
    });

    it('caps lastN so a window cannot ask for an unbounded log', async () => {
      const sports = compareStub();
      await new ComparePlayersTool(sports).execute({
        playerIds: ['1', '2'],
        lastN: 500,
      });

      expect(vi.mocked(sports.comparePlayers)).toHaveBeenCalledWith(
        'nfl',
        ['1', '2'],
        expect.objectContaining({
          window: expect.objectContaining({ lastN: WINDOW_DEFAULTS.maxLastN }),
        }),
      );
    });

    it('needs at least two players', async () => {
      await expect(
        new ComparePlayersTool(compareStub()).execute({ playerIds: ['11834'] }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('refuses more players than it will compare', async () => {
      await expect(
        new ComparePlayersTool(compareStub()).execute({
          playerIds: ['1', '2', '3', '4', '5'],
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });
  });
});

describe('get_schedule', () => {
  const games = [
    {
      gameId: '1',
      date: '2026-09-20',
      week: 2,
      status: 'Final',
      home: 'KC',
      away: 'BUF',
      probables: { home: null, away: null },
      score: { home: 24, away: 21 },
    },
    {
      gameId: '2',
      date: '2026-09-21',
      week: 2,
      status: 'Scheduled',
      home: 'SF',
      away: 'SEA',
      probables: { home: null, away: null },
      score: null,
    },
  ];

  const stub = (rows = games) => {
    const getSchedule = vi.fn().mockResolvedValue({
      sport: 'nfl',
      season: '2026',
      weeks: [2],
      games: rows,
    });
    return {
      getSchedule,
      tool: new ScheduleTool({ getSchedule } as unknown as SportsService),
    };
  };

  it('passes weeks through and returns every game in the window', async () => {
    const { getSchedule, tool } = stub();

    const result = (await tool.execute({ weeks: ['2'] })) as {
      total: number;
      games: { gameId: string }[];
    };

    expect(getSchedule).toHaveBeenCalledWith('nfl', {
      season: undefined,
      startDate: undefined,
      endDate: undefined,
      weeks: [2],
    });
    expect(result.total).toBe(2);
    expect(result.games.map(({ gameId }) => gameId)).toEqual(['1', '2']);
  });

  it('filters to one team, matching either side of the fixture', async () => {
    const { tool } = stub();

    const result = (await tool.execute({ team: 'buf' })) as {
      team: string;
      total: number;
      games: { gameId: string }[];
    };

    expect(result.team).toBe('BUF');
    expect(result.games.map(({ gameId }) => gameId)).toEqual(['1']);
  });

  // An empty probables pair is baseball's shape, not football's: dropping it
  // keeps two null fields per game out of every NFL result.
  it('leaves probables out entirely when there are none', async () => {
    const { tool } = stub();

    const [first] = (
      (await tool.execute({})) as { games: Record<string, unknown>[] }
    ).games;

    expect(first).not.toHaveProperty('probables');
  });

  it('caps how many games one call can return', async () => {
    const many = Array.from({ length: SCHEDULE_LIMIT.max + 10 }, (_, i) => ({
      ...games[0],
      gameId: String(i),
    }));
    const { tool } = stub(many);

    const result = (await tool.execute({ limit: 500 })) as {
      total: number;
      games: unknown[];
    };

    expect(result.total).toBe(many.length);
    expect(result.games).toHaveLength(SCHEDULE_LIMIT.max);
  });
});

describe('get_game_preview', () => {
  const preview = {
    sport: 'mlb',
    season: '2026',
    teams: [
      { team: 'NYY', asOpponent: { pitching: { score: 70, grade: 'good', metrics: [] } } },
      { team: 'BOS', asOpponent: { pitching: { score: 30, grade: 'tough', metrics: [] } } },
    ],
    series: {},
    notes: [],
  };

  const stub = () => {
    const getGamePreview = vi.fn().mockResolvedValue(preview);
    return {
      getGamePreview,
      tool: new GamePreviewTool({ getGamePreview } as unknown as SportsService),
    };
  };

  it('passes both teams and the window through', async () => {
    const { getGamePreview, tool } = stub();

    await tool.execute({
      sport: 'mlb',
      teamA: 'NYY',
      teamB: 'BOS',
      startDate: '2026-07-01',
      endDate: '2026-08-31',
    });

    expect(getGamePreview).toHaveBeenCalledWith(
      'mlb',
      expect.objectContaining({
        teamA: 'NYY',
        teamB: 'BOS',
        startDate: '2026-07-01',
        endDate: '2026-08-31',
      }),
    );
  });

  // A model that cannot find the second team fills the argument in rather than asking.
  it('refuses a placeholder team instead of looking it up upstream', async () => {
    const { getGamePreview, tool } = stub();

    await expect(
      tool.execute({ teamA: 'NYY', teamB: '<team>' }),
    ).rejects.toThrow(BadRequestException);
    expect(getGamePreview).not.toHaveBeenCalled();
  });

  it('drops the per-metric breakdown for a chat turn but keeps the grade', async () => {
    const { tool } = stub();

    const chat = (await tool.execute({
      teamA: 'NYY',
      teamB: 'BOS',
    })) as unknown as {
      teams: { asOpponent: { pitching: Record<string, unknown> } }[];
    };
    expect(chat.teams[0].asOpponent.pitching).toEqual({
      score: 70,
      grade: 'good',
    });

    const full = await tool.execute(
      { teamA: 'NYY', teamB: 'BOS' },
      { full: true },
    );
    expect(full).toBe(preview);
  });
});

describe('get_standings', () => {
  const table = { sport: 'nfl', season: '2026', groups: [], method: 'computed' };

  const stub = () => {
    const getStandings = vi.fn().mockResolvedValue(table);
    return {
      getStandings,
      tool: new StandingsTool({ getStandings } as unknown as SportsService),
    };
  };

  it('passes the season and group filter through', async () => {
    const { getStandings, tool } = stub();

    const result = await tool.execute({
      sport: 'mlb',
      season: '2025',
      group: 'AL East',
    });

    expect(result).toBe(table);
    expect(getStandings).toHaveBeenCalledWith('mlb', {
      season: '2025',
      group: 'AL East',
    });
  });

  it('defaults to the whole league of the default sport', async () => {
    const { getStandings, tool } = stub();

    await tool.execute({});

    expect(getStandings).toHaveBeenCalledWith('nfl', {
      season: undefined,
      group: undefined,
    });
  });
});
