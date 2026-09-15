import { DATA_KINDS } from '../../sports.constants.js';
import { NFL_GROUPS } from './nfl.constants.js';
import {
  aggregateStatLines,
  groupForPosition,
  mapStatLines,
  mapWeeklyLog,
} from './nfl.mapper.js';
import type { SleeperStatEntry } from './nfl.types.js';

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
