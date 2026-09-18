import { NotFoundException } from '@nestjs/common';
import type { SportsService } from '../../sports/sports.service.js';
import { SleeperUserService } from './sleeper.service.js';
import { SleeperUserLeaguesTool } from './user-leagues.tool.js';

const user = { user_id: '123', username: 'travis', display_name: 'Travis' };
const league = {
  league_id: 'L1',
  name: 'The League',
  season: '2026',
  status: 'in_season',
  total_rosters: 12,
};

const sports = {
  getCatalog: async () => ({ defaultSeason: '2026' }),
} as unknown as SportsService;

/** Routes each Sleeper path to a canned body, and records what was asked for. */
const mockSleeper = (bodies: Record<string, unknown>) => {
  const paths: string[] = [];
  vi.stubGlobal('fetch', (url: string) => {
    const path = new URL(url).pathname.replace('/v1', '');
    paths.push(path);
    return Promise.resolve({
      ok: true,
      json: () => Promise.resolve(bodies[path] ?? null),
    } as Response);
  });
  return paths;
};

afterEach(() => vi.unstubAllGlobals());

describe('get_user_leagues', () => {
  const tool = new SleeperUserLeaguesTool(new SleeperUserService(), sports);

  it('defaults to the current NFL season', async () => {
    const paths = mockSleeper({
      '/user/travis': user,
      '/user/123/leagues/nfl/2026': [league],
    });

    await expect(tool.execute({ user_id: 'travis' })).resolves.toMatchObject({
      season: '2026',
      leagues: [{ league_id: 'L1', name: 'The League' }],
    });
    expect(paths).toContain('/user/123/leagues/nfl/2026');
  });

  // It absorbed get_user_info, so the id chain is one call, not two.
  it('returns the user_id a username resolved to', async () => {
    mockSleeper({
      '/user/travis': user,
      '/user/123/leagues/nfl/2026': [league],
    });

    await expect(tool.execute({ user_id: 'travis' })).resolves.toMatchObject({
      user: { user_id: '123', username: 'travis', display_name: 'Travis' },
    });
  });

  it('accepts the username under any of the keys a model might use', async () => {
    mockSleeper({
      '/user/travis': user,
      '/user/123/leagues/nfl/2026': [league],
    });

    await expect(tool.execute({ username: 'travis' })).resolves.toMatchObject({
      user: { user_id: '123' },
    });
  });

  // A small model that never got an answer sends the word instead of asking.
  it.each(['undefined', 'null', '<username>', 'your_username'])(
    'refuses to look up the placeholder %s',
    async (placeholder) => {
      const paths = mockSleeper({});

      await expect(
        tool.execute({ username_or_id: placeholder }),
      ).rejects.toThrow(/Ask the user/);
      expect(paths).toEqual([]);
    },
  );

  // Sleeper answers an unknown user with 200 and a null body, not a 404.
  it('explains that the username was not found', async () => {
    mockSleeper({});

    await expect(tool.execute({ user_id: 'nope' })).rejects.toThrow(
      NotFoundException,
    );
  });

  it('falls back to the previous season when the current one is empty', async () => {
    mockSleeper({
      '/user/travis': user,
      '/user/123/leagues/nfl/2026': [],
      '/user/123/leagues/nfl/2025': [league],
    });

    await expect(tool.execute({ user_id: 'travis' })).resolves.toMatchObject({
      season: '2025',
    });
  });

  it('says the user has no leagues rather than blaming the username', async () => {
    mockSleeper({ '/user/travis': user });

    await expect(tool.execute({ user_id: 'travis' })).rejects.toThrow(
      /no NFL leagues/,
    );
  });
});
