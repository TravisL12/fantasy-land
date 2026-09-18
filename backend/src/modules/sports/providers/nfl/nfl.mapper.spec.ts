import { DATA_KINDS } from '../../sports.constants.js';
import { NFL_GROUPS } from './nfl.constants.js';
import {
  aggregateStatLines,
  groupForPosition,
  mapDirectory,
  mapStatLines,
  mapWeeklyLog,
} from './nfl.mapper.js';
import type {
  SleeperDirectoryEntry,
  SleeperStatEntry,
} from './nfl.types.js';

const [offense] = NFL_GROUPS;

const entry = (overrides: Partial<SleeperStatEntry>): SleeperStatEntry => ({
  player_id: '4984',
  team: 'BUF',
  week: null,
  date: null,
  stats: {},
  player: {
    first_name: 'Josh',
    last_name: 'Allen',
    position: 'QB',
    team: 'BUF',
  },
  ...overrides,
});

describe('NFL mapper', () => {
  it('keeps players with games and only known stats', () => {
    const lines = mapStatLines(
      [
        entry({
          stats: { gp: 17, pass_yd: 3668, pts_ppr: 374.62, rank_ppr: 3 },
        }),
        entry({ player_id: '1', stats: {} }),
        entry({ player_id: '2', stats: { gms_active: 1, pos_rank_ppr: 999 } }),
      ],
      offense,
      DATA_KINDS.stats,
    );

    expect(lines).toEqual([
      {
        player: { id: '4984', name: 'Josh Allen', team: 'BUF', position: 'QB' },
        gamesPlayed: 17,
        stats: { pass_yd: 3668 },
      },
    ]);
  });

  it('keeps only projections with projected points', () => {
    const lines = mapStatLines(
      [
        entry({ stats: { gp: 1, pts_ppr: 20.9, pass_yd: 267.2 } }),
        entry({ player_id: '2', stats: { adp_dd_ppr: 1000 } }),
      ],
      offense,
      DATA_KINDS.projections,
    );
    expect(lines).toHaveLength(1);
    expect(lines[0].gamesPlayed).toBe(1);
  });

  it('drops bye weeks and sorts the weekly log', () => {
    const log = mapWeeklyLog(
      {
        '2': entry({
          week: 2,
          opponent: 'NYJ',
          is_away_team: true,
          stats: { gp: 1, pass_td: 2 },
        }),
        '1': entry({
          week: 1,
          opponent: 'BAL',
          is_away_team: false,
          stats: { gp: 1 },
        }),
        '7': null,
      },
      offense,
    );

    expect(log.map((e) => [e.week, e.opponent, e.isHome])).toEqual([
      [1, 'BAL', true],
      [2, 'NYJ', false],
    ]);
  });

  it('aggregates weeks and rebuilds rate stats', () => {
    const week = (team: string, pass_cmp: number, pass_att: number) => ({
      player: { id: '4984', name: 'Josh Allen', team, position: 'QB' },
      gamesPlayed: 1,
      stats: { pass_cmp, pass_att, cmp_pct: 999 },
    });

    const [season] = aggregateStatLines(
      [[week('BUF', 20, 30)], [week('NYJ', 25, 30)]],
      offense,
    );

    expect(season.gamesPlayed).toBe(2);
    expect(season.player.team).toBe('NYJ');
    expect(season.stats).toEqual({ pass_cmp: 45, pass_att: 60, cmp_pct: 75 });
  });

  it('routes positions to stat groups', () => {
    expect(groupForPosition('K')).toBe('kicking');
    expect(groupForPosition('DEF')).toBe('defense');
    expect(groupForPosition('WR')).toBe('offense');
  });
});

describe('mapDirectory', () => {
  const entry = (
    overrides: Partial<SleeperDirectoryEntry> = {},
  ): SleeperDirectoryEntry => ({
    player_id: '4984',
    first_name: 'Josh',
    last_name: 'Allen',
    full_name: 'Josh Allen',
    position: 'QB',
    team: 'BUF',
    fantasy_positions: ['QB'],
    status: 'Active',
    search_rank: 4,
    ...overrides,
  });

  it('keeps only players who can score in a lineup', () => {
    const players = mapDirectory({
      '1': entry(),
      '2': entry({ player_id: '2', position: 'OL', fantasy_positions: ['OL'] }),
      '3': entry({ player_id: '3', position: 'K', fantasy_positions: ['K'] }),
      // Upstream really does return null values in this payload.
      '4': null,
    });

    expect(players.map(({ id }) => id)).toEqual(['4984', '3']);
  });

  it('files each player in the group their position scores in', () => {
    const [kicker] = mapDirectory({
      '1': entry({ position: 'K', fantasy_positions: ['K'] }),
    });

    expect(kicker.group).toBe('kicking');
  });

  it('normalizes roster wording onto shared availability', () => {
    const [ir] = mapDirectory({
      '1': entry({ status: 'Injured Reserve' }),
    });
    const [squad] = mapDirectory({
      '1': entry({ status: 'Practice Squad' }),
    });

    expect(ir.availability).toBe('injured');
    expect(ir.status).toBe('Injured Reserve');
    expect(squad.availability).toBe('minors');
  });

  it('lets a game-status designation override an active roster spot', () => {
    const [out] = mapDirectory({
      '1': entry({ status: 'Active', injury_status: 'Out' }),
    });
    const [questionable] = mapDirectory({
      '1': entry({ status: 'Active', injury_status: 'Questionable' }),
    });

    expect(out.availability).toBe('injured');
    // Questionable is a warning, not an absence: he is still expected to play.
    expect(questionable.availability).toBe('active');
  });

  it('falls back to the name parts when there is no full name', () => {
    const [player] = mapDirectory({
      '1': entry({ full_name: null }),
    });

    expect(player.name).toBe('Josh Allen');
  });
});
