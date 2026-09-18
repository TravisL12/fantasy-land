import { BadRequestException } from '@nestjs/common';
import type { SportsService } from '../../sports/sports.service.js';
import { ExpectedPointsTool } from './expected-points.tool.js';
import { EXPECTED_POINTS_LIMIT } from './football-tools.constants.js';

const board = {
  sport: 'nfl' as const,
  season: '2025',
  week: null,
  group: 'offense',
  scoring: 'ppr',
  models: [
    {
      position: 'WR',
      observations: 120,
      rSquared: 0.86,
      weights: { rec_tgt: 1.42, rec_air_yd: 0.03 },
    },
  ],
  total: 1,
  rows: [
    {
      player: { id: '4046', name: 'Some Receiver', team: 'NO', position: 'WR' },
      gamesPlayed: 12,
      fantasyPoints: 180.4,
      pointsPerGame: 15,
      expectedPoints: 150.2,
      expectedPointsPerGame: 12.5,
      delta: 30.2,
      deltaPerGame: 2.5,
      efficiency: 1.2,
      model: 'WR',
      opportunities: { rec_tgt: 110, rec_air_yd: 940 },
    },
  ],
};

const serviceWith = (result: unknown = board) =>
  ({
    getExpectedPoints: vi.fn().mockResolvedValue(result),
  }) as unknown as SportsService;

describe('get_expected_points', () => {
  it('defaults to nfl and to a season-wide board', async () => {
    const sports = serviceWith();
    await new ExpectedPointsTool(sports).execute({});

    expect(sports.getExpectedPoints).toHaveBeenCalledWith(
      'nfl',
      expect.objectContaining({
        week: undefined,
        limit: EXPECTED_POINTS_LIMIT.default,
      }),
    );
  });

  it('coerces the arguments a small model sends as strings', async () => {
    const sports = serviceWith();
    await new ExpectedPointsTool(sports).execute({
      week: '4',
      minGames: '3',
      limit: '5',
      position: 'wr',
      playerIds: '4046',
    });

    expect(sports.getExpectedPoints).toHaveBeenCalledWith(
      'nfl',
      expect.objectContaining({
        week: 4,
        minGames: 3,
        limit: 5,
        position: 'WR',
        playerIds: ['4046'],
      }),
    );
  });

  it('caps the limit it was asked for', async () => {
    const sports = serviceWith();
    await new ExpectedPointsTool(sports).execute({ limit: 500 });

    expect(sports.getExpectedPoints).toHaveBeenCalledWith(
      'nfl',
      expect.objectContaining({ limit: EXPECTED_POINTS_LIMIT.max }),
    );
  });

  it('flattens rows and says what the number means', async () => {
    const result = (await new ExpectedPointsTool(serviceWith()).execute(
      {},
    )) as { method: string; rows: Record<string, unknown>[] };

    expect(result.rows[0]).toMatchObject({
      name: 'Some Receiver',
      position: 'WR',
      expectedPoints: 150.2,
      delta: 30.2,
    });
    expect(result.method).toContain('not a forecast');
  });

  it('keeps the opportunity counts and model weights out of a chat turn', async () => {
    const tool = new ExpectedPointsTool(serviceWith());

    const chat = (await tool.execute({})) as {
      rows: Record<string, unknown>[];
      models: Record<string, unknown>[];
    };
    expect(chat.rows[0].opportunities).toBeUndefined();
    expect(chat.models[0].weights).toBeUndefined();
    // The fit itself still travels: a board nobody can size up is not usable.
    expect(chat.models[0]).toMatchObject({ rSquared: 0.86, observations: 120 });

    const dashboard = (await tool.execute({}, { full: true })) as {
      rows: Record<string, unknown>[];
      models: Record<string, unknown>[];
    };
    expect(dashboard.rows[0].opportunities).toEqual({
      rec_tgt: 110,
      rec_air_yd: 940,
    });
    expect(dashboard.models[0].weights).toBeDefined();
  });

  it('passes a service rejection through so the model can fix it', async () => {
    const sports = {
      getExpectedPoints: vi
        .fn()
        .mockRejectedValue(new BadRequestException('No expected-points model')),
    } as unknown as SportsService;

    await expect(new ExpectedPointsTool(sports).execute({})).rejects.toThrow(
      BadRequestException,
    );
  });
});
