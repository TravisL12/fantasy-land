import { MATCHUP_GRADES } from '../sports.constants.js';
import type { MatchupMetric, TeamStrength } from '../sports.types.js';
import { rateMatchups } from './matchup.js';

const team = (name: string, runs: number, ops: number): TeamStrength => ({
  team: name,
  gamesPlayed: 100,
  hitting: { runs, ops },
  pitching: {},
});

const metrics: MatchupMetric[] = [
  {
    key: 'runs',
    label: 'Runs',
    betterWhenHigh: true,
    value: ({ hitting }) => hitting.runs,
  },
  {
    key: 'ops',
    label: 'OPS',
    betterWhenHigh: true,
    value: ({ hitting }) => hitting.ops,
  },
];

describe('rateMatchups', () => {
  it('scores the weakest opponent as the easiest matchup', () => {
    const ratings = rateMatchups(
      [team('AAA', 900, 0.8), team('BBB', 700, 0.72), team('CCC', 500, 0.65)],
      metrics,
    );

    expect(ratings.get('CCC')!.score).toBeGreaterThan(
      ratings.get('BBB')!.score,
    );
    expect(ratings.get('BBB')!.score).toBeGreaterThan(
      ratings.get('AAA')!.score,
    );
    expect(ratings.get('CCC')!.grade).toBe(MATCHUP_GRADES.great);
    expect(ratings.get('AAA')!.grade).toBe(MATCHUP_GRADES.brutal);
  });

  it('inverts metrics where a high value helps the player facing the team', () => {
    const era: MatchupMetric = {
      key: 'era',
      label: 'ERA',
      betterWhenHigh: false,
      value: ({ pitching }) => pitching.era,
    };
    const teams: TeamStrength[] = [
      { team: 'AAA', gamesPlayed: 1, hitting: {}, pitching: { era: 5.5 } },
      { team: 'BBB', gamesPlayed: 1, hitting: {}, pitching: { era: 2.5 } },
    ];

    const ratings = rateMatchups(teams, [era]);

    // A high ERA is bad for that staff, so it is a good matchup for the hitter.
    expect(ratings.get('AAA')!.score).toBeGreaterThan(
      ratings.get('BBB')!.score,
    );
  });

  it('skips metrics a team has no value for rather than scoring them zero', () => {
    const teams = [team('AAA', 900, 0.8), team('BBB', 700, 0.72)];
    delete teams[0].hitting.ops;

    const ratings = rateMatchups(teams, metrics);

    expect(ratings.get('AAA')!.metrics.map(({ key }) => key)).toEqual(['runs']);
    expect(ratings.get('BBB')!.metrics).toHaveLength(2);
  });

  it('falls back to a neutral score when nothing can be measured', () => {
    const ratings = rateMatchups(
      [{ team: 'AAA', gamesPlayed: 0, hitting: {}, pitching: {} }],
      metrics,
    );

    expect(ratings.get('AAA')).toEqual({
      score: 50,
      grade: MATCHUP_GRADES.neutral,
      metrics: [],
    });
  });
});
