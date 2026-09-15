import { MLB_GROUPS } from './mlb.constants.js';
import { mapGameLog, mapSeasonSplits, parseInnings } from './mlb.mapper.js';
import type { MlbSeasonSplit } from './mlb.types.js';

const [hitting, pitching] = MLB_GROUPS;
const teams = { 143: 'PHI', 113: 'CIN' };

describe('MLB mapper', () => {
  it('parses innings notation into thirds', () => {
    expect(parseInnings('184.2')).toBeCloseTo(184.667, 3);
    expect(parseInnings('7.0')).toBe(7);
    expect(parseInnings('-.--')).toBeUndefined();
  });

  it('normalizes a hitter season split and derives singles', () => {
    const split: MlbSeasonSplit = {
      player: { id: 656941, fullName: 'Kyle Schwarber' },
      team: { id: 143, name: 'Philadelphia Phillies' },
      position: { abbreviation: 'DH', type: 'Hitter' },
      stat: {
        gamesPlayed: 144,
        hits: 129,
        doubles: 17,
        triples: 1,
        homeRuns: 44,
        avg: '.238',
        stolenBasePercentage: '.---',
      },
    };

    const [line] = mapSeasonSplits([split], hitting, teams);

    expect(line.player).toEqual({
      id: '656941',
      name: 'Kyle Schwarber',
      team: 'PHI',
      position: 'DH',
    });
    expect(line.gamesPlayed).toBe(144);
    expect(line.stats).toMatchObject({ singles: 67, homeRuns: 44, avg: 0.238 });
    expect(line.stats).not.toHaveProperty('stolenBasePercentage');
  });

  it('labels pitchers as starters or relievers by usage', () => {
    const pitcher = (
      gamesPlayed: number,
      gamesStarted: number,
    ): MlbSeasonSplit => ({
      player: { id: gamesStarted, fullName: 'P' },
      stat: { gamesPlayed, gamesStarted, inningsPitched: '10.1' },
    });

    const [starter, reliever] = mapSeasonSplits(
      [pitcher(30, 30), pitcher(60, 2)],
      pitching,
      teams,
    );

    expect(starter.player.position).toBe('SP');
    expect(reliever.player.position).toBe('RP');
    expect(starter.stats.inningsPitched).toBeCloseTo(10.333, 3);
  });

  it('maps game log opponents to abbreviations', () => {
    const [entry] = mapGameLog(
      [
        {
          date: '2026-09-14',
          isHome: false,
          opponent: { id: 113 },
          stat: { strikeOuts: 9 },
        },
      ],
      pitching,
      teams,
    );
    expect(entry).toMatchObject({
      date: '2026-09-14',
      opponent: 'CIN',
      isHome: false,
      week: null,
    });
  });
});
