import { MLB_GROUPS } from './mlb.constants.js';
import {
  mapGameLog,
  mapRoster,
  mapSchedule,
  mapSeasonSplits,
  mapTeamStrength,
  parseInnings,
} from './mlb.mapper.js';
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

describe('MLB schedule mapper', () => {
  const scheduleDay = (
    status: { detailedState: string; abstractGameState?: string },
    scores: { home?: number; away?: number },
  ) => [
    {
      date: '2026-09-16',
      games: [
        {
          gamePk: 1,
          officialDate: '2026-09-16',
          status,
          teams: {
            home: { team: { id: 143, name: 'Philadelphia Phillies' }, score: scores.home },
            away: { team: { id: 113, name: 'Cincinnati Reds' }, score: scores.away },
          },
        },
      ],
    },
  ];

  it('keeps the final score as the result of the game', () => {
    const [game] = mapSchedule(
      scheduleDay(
        { detailedState: 'Final', abstractGameState: 'Final' },
        { home: 6, away: 2 },
      ),
      teams,
    );

    expect(game.score).toEqual({ home: 6, away: 2 });
  });

  // A game in progress already has a running score; treating it as final
  // would hand a head-to-head record a result that has not happened yet.
  it('leaves a live game without a score', () => {
    const [game] = mapSchedule(
      scheduleDay(
        { detailedState: 'In Progress', abstractGameState: 'Live' },
        { home: 3, away: 1 },
      ),
      teams,
    );

    expect(game.score).toBe(null);
  });


  it('maps probable pitchers to both sides of a game', () => {
    const games = mapSchedule(
      [
        {
          date: '2026-09-16',
          games: [
            {
              gamePk: 824382,
              officialDate: '2026-09-16',
              status: { detailedState: 'Scheduled' },
              teams: {
                home: {
                  team: { id: 143, name: 'Philadelphia Phillies' },
                  probablePitcher: { id: 1, fullName: 'Zack Wheeler' },
                },
                away: {
                  team: { id: 113, name: 'Cincinnati Reds' },
                  probablePitcher: { id: 2, fullName: 'Hunter Greene' },
                },
              },
            },
          ],
        },
      ],
      teams,
    );

    expect(games).toEqual([
      {
        gameId: '824382',
        week: null,
        date: '2026-09-16',
        status: 'Scheduled',
        home: 'PHI',
        away: 'CIN',
        score: null,
        probables: {
          home: {
            playerId: '1',
            name: 'Zack Wheeler',
            team: 'PHI',
            opponent: 'CIN',
            isHome: true,
          },
          away: {
            playerId: '2',
            name: 'Hunter Greene',
            team: 'CIN',
            opponent: 'PHI',
            isHome: false,
          },
        },
      },
    ]);
  });

  it('keeps a game whose starters have not been announced', () => {
    const [game] = mapSchedule(
      [
        {
          date: '2026-09-20',
          games: [
            {
              gamePk: 1,
              officialDate: '2026-09-20',
              status: { detailedState: 'Scheduled' },
              teams: {
                home: { team: { id: 143 } },
                away: { team: { id: 113 } },
              },
            },
          ],
        },
      ],
      teams,
    );

    expect(game.probables).toEqual({ home: null, away: null });
  });
});

describe('MLB team strength mapper', () => {
  it('merges a team’s hitting and pitching lines into one entry', () => {
    const strength = mapTeamStrength(
      [{ team: { id: 143 }, stat: { gamesPlayed: 150, runs: 684, ops: '.735' } }],
      [{ team: { id: 143 }, stat: { gamesPlayed: 150, era: '3.47', whip: '1.18' } }],
      teams,
    );

    expect(strength).toEqual([
      {
        team: 'PHI',
        gamesPlayed: 150,
        hitting: { gamesPlayed: 150, runs: 684, ops: 0.735 },
        pitching: { gamesPlayed: 150, era: 3.47, whip: 1.18 },
      },
    ]);
  });
});

describe('MLB roster mapper', () => {
  it('normalizes injured-list wording into an availability', () => {
    const players = mapRoster(
      [
        {
          person: { id: 1, fullName: 'Healthy Hitter' },
          position: { abbreviation: 'SS', type: 'Infielder' },
          status: { code: 'A', description: 'Active' },
        },
        {
          person: { id: 2, fullName: 'Hurt Hitter' },
          position: { abbreviation: '1B', type: 'Infielder' },
          status: { code: 'D10', description: 'Injured 10-Day' },
        },
        {
          person: { id: 3, fullName: 'Season Ender' },
          position: { abbreviation: 'P', type: 'Pitcher' },
          // An unmapped code has to fall back to the wording.
          status: { code: 'XX', description: 'Injured - Full Season' },
        },
        {
          person: { id: 4, fullName: 'Farmhand' },
          position: { abbreviation: 'CF', type: 'Outfielder' },
          status: { code: 'RM', description: 'Reassigned to Minors' },
        },
      ],
      'PHI',
    );

    expect(players.map(({ availability }) => availability)).toEqual([
      'active',
      'injured',
      'injured',
      'minors',
    ]);
    expect(players[1]).toMatchObject({
      playerId: '2',
      team: 'PHI',
      position: '1B',
      status: 'Injured 10-Day',
    });
  });

  it('treats an unrecognizable status as unavailable rather than active', () => {
    const [player] = mapRoster(
      [
        {
          person: { id: 9, fullName: 'Mystery Man' },
          status: { code: 'ZZ', description: 'Suspended' },
        },
      ],
      'PHI',
    );

    expect(player.availability).toBe('inactive');
    expect(player.position).toBeNull();
  });
});
