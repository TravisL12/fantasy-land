import type { SportsService } from '../../sports/sports.service.js';
import { MatchupRatingsTool } from './matchup-ratings.tool.js';
import { PitcherStartsTool } from './pitcher-starts.tool.js';

const start = (
  date: string,
  confidence = 'confirmed',
  matchup?: Record<string, unknown>,
) => ({
  date,
  opponent: 'BOS',
  isHome: true,
  confidence,
  ...(matchup && { matchup }),
});

const pitcher = (
  id: string,
  starts: ReturnType<typeof start>[],
  team = 'PHI',
) => ({
  player: { id, name: id, team, position: 'SP' },
  starts,
  confirmedStarts: starts.filter((s) => s.confidence === 'confirmed').length,
  matchupScore: 70,
});

const sportsStub = (overrides: Partial<SportsService>) =>
  overrides as unknown as SportsService;

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

  // The behaviour get_probable_pitchers used to be a separate tool for.
  it('keeps only announced starts when confirmedOnly is set', async () => {
    const tool = new PitcherStartsTool(
      sportsStub({
        getStarts: vi.fn().mockResolvedValue({
          sport: 'mlb',
          season: '2026',
          pitchers: [
            pitcher('mixed', [
              start('2026-09-16'),
              start('2026-09-21', 'projected'),
            ]),
            pitcher('projected-only', [start('2026-09-20', 'projected')]),
          ],
        }),
      }),
    );

    const result = await tool.execute({ confirmedOnly: 'true' });

    expect(result.pitchers).toHaveLength(1);
    expect(result.pitchers[0].player.id).toBe('mixed');
    expect(result.pitchers[0].starts).toEqual([
      expect.objectContaining({ date: '2026-09-16' }),
    ]);
    expect(result.pitchers[0].confirmedStarts).toBe(1);
  });

  it('explains an empty confirmed window rather than answering with nothing', async () => {
    const tool = new PitcherStartsTool(
      sportsStub({
        getStarts: vi.fn().mockResolvedValue({
          sport: 'mlb',
          season: '2026',
          pitchers: [pitcher('later', [start('2026-09-30', 'projected')])],
        }),
      }),
    );

    const result = await tool.execute({ confirmedOnly: true });

    expect(result.pitchers).toEqual([]);
    expect(result.note).toMatch(/four days ahead/);
  });

  it('filters to one team', async () => {
    const tool = new PitcherStartsTool(
      sportsStub({
        getStarts: vi.fn().mockResolvedValue({
          sport: 'mlb',
          season: '2026',
          pitchers: [
            pitcher('phi', [start('2026-09-16')]),
            pitcher('nyy', [start('2026-09-16')], 'NYY'),
          ],
        }),
      }),
    );

    const result = await tool.execute({ team: 'nyy' });

    expect(result.pitchers.map(({ player }) => player.id)).toEqual(['nyy']);
  });

  it('drops the per-metric breakdown for a chat turn but keeps it for a dashboard', async () => {
    const matchup = {
      score: 62.5,
      grade: 'good',
      metrics: [{ key: 'ops', label: 'OPS', value: 0.712, rank: 62.5 }],
    };
    const getStarts = vi.fn().mockResolvedValue({
      sport: 'mlb',
      season: '2026',
      pitchers: [pitcher('a', [start('2026-09-16', 'confirmed', matchup)])],
    });
    const tool = new PitcherStartsTool(sportsStub({ getStarts }));

    const chat = await tool.execute({});
    expect(chat.pitchers[0].starts[0].matchup).toEqual({
      score: 62.5,
      grade: 'good',
    });

    const dashboard = await tool.execute({}, { full: true });
    expect(dashboard.pitchers[0].starts[0].matchup).toEqual(matchup);
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

  // The key says the same thing, and there is one label per metric per team.
  it('drops the metric labels for a chat turn and keeps them for a dashboard', async () => {
    const teams = [
      {
        team: 'COL',
        score: 88,
        grade: 'great',
        metrics: [{ key: 'ops', label: 'OPS', value: 0.65, rank: 88 }],
      },
    ];
    const tool = new MatchupRatingsTool(
      sportsStub({
        getMatchupBoard: vi
          .fn()
          .mockResolvedValue({ sport: 'mlb', season: '2026', side: 'pitching', teams }),
      }),
    );

    const chat = await tool.execute({});
    expect(chat.teams[0].metrics).toEqual([
      { key: 'ops', value: 0.65, rank: 88 },
    ]);

    const dashboard = await tool.execute({}, { full: true });
    expect(dashboard.teams[0].metrics).toEqual(teams[0].metrics);
  });
});
