import { NotFoundException } from '@nestjs/common';
import type { SportsService } from '../../sports/sports.service.js';
import { PlayerStatusTool } from './player-status.tool.js';

const statuses = [
  { name: 'Bryce Harper', availability: 'injured' },
  { name: 'Zack Wheeler', availability: 'active' },
];

const toolWith = (players: unknown[] = statuses) => {
  const getPlayerStatuses = vi.fn().mockResolvedValue({
    sport: 'nfl',
    season: '2026',
    source: 'directory',
    players,
  });
  return {
    tool: new PlayerStatusTool({ getPlayerStatuses } as unknown as SportsService),
    getPlayerStatuses,
  };
};

describe('get_player_status', () => {
  it('defaults to unavailable players when sweeping', async () => {
    const { tool, getPlayerStatuses } = toolWith();

    await tool.execute({ team: 'PHI' });

    expect(getPlayerStatuses).toHaveBeenCalledWith(
      'nfl',
      expect.objectContaining({ availability: ['injured', 'inactive'] }),
    );
  });

  it('does not filter out healthy players when a name is searched', async () => {
    const { tool, getPlayerStatuses } = toolWith();

    await tool.execute({ search: 'Wheeler' });

    expect(getPlayerStatuses).toHaveBeenCalledWith(
      'nfl',
      expect.objectContaining({ availability: [], search: 'Wheeler' }),
    );
  });

  it('serves whichever sport was asked for, not just baseball', async () => {
    const { tool, getPlayerStatuses } = toolWith();

    await tool.execute({ sport: 'mlb', team: 'PHI' });

    expect(getPlayerStatuses).toHaveBeenCalledWith('mlb', expect.anything());
  });

  it('passes on which source the answer came from', async () => {
    const { tool } = toolWith();

    const result = (await tool.execute({ team: 'PHI' })) as {
      source: string;
    };

    // A club's 40-man and the league directory are different populations.
    expect(result.source).toBe('directory');
  });

  it('reports no match rather than returning an empty list', async () => {
    const { tool } = toolWith([]);

    await expect(tool.execute({ search: 'Nobody' })).rejects.toThrow(
      NotFoundException,
    );
  });
});
