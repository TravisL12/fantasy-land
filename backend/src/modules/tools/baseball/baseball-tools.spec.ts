import { BadRequestException, NotFoundException } from '@nestjs/common';
import type { SportsService } from '../../sports/sports.service.js';
import { MatchupRatingsTool } from './matchup-ratings.tool.js';
import { PitcherStartsTool } from './pitcher-starts.tool.js';
import { PlayerStatusTool } from './player-status.tool.js';
import { ProbablePitchersTool } from './probable-pitchers.tool.js';
import { TeamHeadToHeadTool } from './team-head-to-head.tool.js';

const start = (date: string, confidence = 'confirmed') => ({
  date,
  opponent: 'BOS',
  isHome: true,
  confidence,
});

const pitcher = (id: string, starts: ReturnType<typeof start>[]) => ({
  player: { id, name: id, team: 'PHI', position: 'SP' },
  starts,
  confirmedStarts: starts.filter((s) => s.confidence === 'confirmed').length,
  matchupScore: 70,
});

const sportsStub = (overrides: Partial<SportsService>) =>
  overrides as unknown as SportsService;

describe('get_probable_pitchers', () => {
  it('defaults to mlb and passes the window through', async () => {
    const getProbableStarters = vi
      .fn()
      .mockResolvedValue({ sport: 'mlb', season: '2026', starters: [] });
    const tool = new ProbablePitchersTool(sportsStub({ getProbableStarters }));

    const result = await tool.execute({
      startDate: '2026-09-16',
      endDate: '2026-09-22',
      team: 'PHI',
    });

    expect(getProbableStarters).toHaveBeenCalledWith('mlb', {
      season: undefined,
      startDate: '2026-09-16',
      endDate: '2026-09-22',
      team: 'PHI',
    });
    // An empty window is normal early in a week, so it explains itself.
    expect(result.note).toMatch(/four days ahead/);
  });

  it('caps the list so a full slate cannot bury the question', async () => {
    const starters = Array.from({ length: 40 }, (_, i) => ({ playerId: `${i}` }));
    const tool = new ProbablePitchersTool(
      sportsStub({
        getProbableStarters: vi
          .fn()
          .mockResolvedValue({ sport: 'mlb', season: '2026', starters }),
      }),
    );

    const result = await tool.execute({ limit: '5' });

    expect(result.total).toBe(40);
    expect(result.starters).toHaveLength(5);
  });
});

describe('get_pitcher_starts', () => {
  it('filters to two-start pitchers when asked', async () => {
    const tool = new PitcherStartsTool(
      sportsStub({
        getStarts: vi.fn().mockResolvedValue({
          sport: 'mlb',
          season: '2026',
          pitchers: [
            pitcher('two', [start('2026-09-16'), start('2026-09-21', 'projected')]),
            pitcher('one', [start('2026-09-17')]),
          ],
        }),
      }),
    );

    const result = await tool.execute({ minStarts: '2' });

    expect(result.pitchers.map(({ player }) => player.id)).toEqual(['two']);
    expect(result.total).toBe(1);
  });

  it('accepts a bare player id where an array is expected', async () => {
    const getStarts = vi
      .fn()
      .mockResolvedValue({ sport: 'mlb', season: '2026', pitchers: [] });
    const tool = new PitcherStartsTool(sportsStub({ getStarts }));

    await tool.execute({ playerIds: '554430' });

    expect(getStarts).toHaveBeenCalledWith(
      'mlb',
      expect.objectContaining({ playerIds: ['554430'] }),
    );
  });
});

describe('get_matchup_ratings', () => {
  it('defaults to the pitching side', async () => {
    const getMatchupBoard = vi
      .fn()
      .mockResolvedValue({ sport: 'mlb', season: '2026', side: 'pitching', teams: [] });
    const tool = new MatchupRatingsTool(sportsStub({ getMatchupBoard }));

    await tool.execute({});

    expect(getMatchupBoard).toHaveBeenCalledWith('mlb', 'pitching', undefined);
  });
});

describe('get_player_status', () => {
  const statuses = [
    { name: 'Bryce Harper', availability: 'injured' },
    { name: 'Zack Wheeler', availability: 'active' },
  ];

  it('defaults to unavailable players when sweeping', async () => {
    const getPlayerStatuses = vi
      .fn()
      .mockResolvedValue({ sport: 'mlb', season: '2026', players: statuses });
    const tool = new PlayerStatusTool(sportsStub({ getPlayerStatuses }));

    await tool.execute({ team: 'PHI' });

    expect(getPlayerStatuses).toHaveBeenCalledWith(
      'mlb',
      expect.objectContaining({ availability: ['injured', 'inactive'] }),
    );
  });

  it('does not filter out healthy players when a name is searched', async () => {
    const getPlayerStatuses = vi
      .fn()
      .mockResolvedValue({ sport: 'mlb', season: '2026', players: statuses });
    const tool = new PlayerStatusTool(sportsStub({ getPlayerStatuses }));

    await tool.execute({ search: 'Wheeler' });

    expect(getPlayerStatuses).toHaveBeenCalledWith(
      'mlb',
      expect.objectContaining({ availability: [], search: 'Wheeler' }),
    );
  });

  it('reports no match rather than returning an empty list', async () => {
    const tool = new PlayerStatusTool(
      sportsStub({
        getPlayerStatuses: vi
          .fn()
          .mockResolvedValue({ sport: 'mlb', season: '2026', players: [] }),
      }),
    );

    await expect(tool.execute({ search: 'Nobody' })).rejects.toThrow(
      NotFoundException,
    );
  });
});

describe('compare_teams', () => {
  const comparison = { sport: 'mlb', season: '2026', teams: [], series: {} };

  const stub = () => {
    const getTeamHeadToHead = vi.fn().mockResolvedValue(comparison);
    return { getTeamHeadToHead, tool: new TeamHeadToHeadTool(sportsStub({ getTeamHeadToHead })) };
  };

  it('defaults to mlb and passes both teams and the window through', async () => {
    const { getTeamHeadToHead, tool } = stub();

    const result = await tool.execute({
      teamA: 'NYY',
      teamB: 'BOS',
      startDate: '2026-07-01',
      endDate: '2026-08-31',
    });

    expect(result).toBe(comparison);
    expect(getTeamHeadToHead).toHaveBeenCalledWith('mlb', {
      teamA: 'NYY',
      teamB: 'BOS',
      season: undefined,
      startDate: '2026-07-01',
      endDate: '2026-08-31',
    });
  });

  // A model that cannot find the second team fills the argument in rather than asking.
  it('refuses a placeholder team instead of looking it up upstream', async () => {
    const { getTeamHeadToHead, tool } = stub();

    await expect(
      tool.execute({ teamA: 'NYY', teamB: '<team>' }),
    ).rejects.toThrow(BadRequestException);
    expect(getTeamHeadToHead).not.toHaveBeenCalled();
  });
});
