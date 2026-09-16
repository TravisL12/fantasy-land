import { BadRequestException, NotFoundException } from '@nestjs/common';
import type {
  PlayerStatsResponseDto,
  StatsResponseDto,
} from '../../sports/dto/stats-response.dto.js';
import type { SportsService } from '../../sports/sports.service.js';
import { ComparePlayersTool } from './compare-players.tool.js';
import { FindPlayerTool } from './find-player.tool.js';
import { LeaderboardTool } from './leaderboard.tool.js';
import { LEADERBOARD_LIMIT } from './sports-tools.constants.js';
import { PlayerGameLogTool } from './player-game-log.tool.js';
import { PlayerSeasonStatsTool } from './player-season-stats.tool.js';

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

const sportsStub = (groups = [{ key: 'offense' }]) =>
  ({
    getStats: vi.fn().mockResolvedValue(statsResponse),
    getPlayerStats: vi.fn().mockResolvedValue(playerStatsResponse),
    getCatalog: vi.fn().mockResolvedValue({ groups }),
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

  describe('get_player_season_stats', () => {
    it('returns totals and consistency without the game log', async () => {
      const result = await new PlayerSeasonStatsTool(sportsStub()).execute({
        playerId: '11834',
      });

      expect(result).toMatchObject({
        player: vele,
        totals: { rec: 25, rec_yd: 293 },
        fantasyPoints: 66.3,
        pointsPerGame: 5.1,
      });
      expect(result).not.toHaveProperty('entries');
      expect(result).not.toHaveProperty('games');
    });

    it('requires a player id', async () => {
      await expect(
        new PlayerSeasonStatsTool(sportsStub()).execute({}),
      ).rejects.toBeInstanceOf(BadRequestException);
    });
  });

  describe('get_player_game_log', () => {
    it('returns only the last N games when asked', async () => {
      const result = (await new PlayerGameLogTool(sportsStub()).execute({
        playerId: '11834',
        lastN: 3,
      })) as { games: { week: number }[] };

      expect(result.games.map((game) => game.week)).toEqual([11, 12, 13]);
    });

    it('coerces a stringified number, as small models often send', async () => {
      const result = (await new PlayerGameLogTool(sportsStub()).execute({
        playerId: '11834',
        lastN: '2',
      })) as { games: { week: number }[] };

      expect(result.games).toHaveLength(2);
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
    it('scores every player on the same preset and names the leader', async () => {
      const sports = sportsStub();
      const result = (await new ComparePlayersTool(sports).execute({
        playerIds: ['11834', '9509'],
        scoring: 'ppr',
      })) as { players: unknown[]; bestPointsPerGame: string };

      expect(result.players).toHaveLength(2);
      expect(result.bestPointsPerGame).toBe('Devaughn Vele');
      expect(vi.mocked(sports.getPlayerStats)).toHaveBeenCalledWith(
        'nfl',
        '9509',
        expect.objectContaining({ scoring: 'ppr' }),
      );
    });

    it('needs at least two players', async () => {
      await expect(
        new ComparePlayersTool(sportsStub()).execute({ playerIds: ['11834'] }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('refuses more players than it will compare', async () => {
      await expect(
        new ComparePlayersTool(sportsStub()).execute({
          playerIds: ['1', '2', '3', '4', '5'],
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });
  });
});
