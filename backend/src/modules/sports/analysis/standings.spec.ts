import { CLINCH_STATUS } from '../sports.constants.js';
import type { StandingsEntry } from '../sports.types.js';
import { clinchNumbers, magicNumberOver } from './standings.js';

const team = (
  name: string,
  wins: number,
  losses: number,
  ties = 0,
): StandingsEntry => ({
  team: name,
  name,
  wins,
  losses,
  ties,
  winPct: wins / Math.max(1, wins + losses + ties),
  gamesPlayed: wins + losses + ties,
  gamesRemaining: 17 - (wins + losses + ties),
  gamesBack: null,
  scoredFor: 0,
  scoredAgainst: 0,
  streak: null,
  rank: 1,
  playoffSeed: null,
  clinch: CLINCH_STATUS.contending,
  clinchNote: null,
  magicNumber: null,
  eliminationNumber: null,
  wildCard: null,
});

describe('magicNumberOver', () => {
  it('counts every own win and every rival loss once', () => {
    // 17 + 1 − 10 wins − 4 rival losses = 4 still needed.
    expect(magicNumberOver(team('A', 10, 2), team('B', 6, 4), 17)).toBe(4);
  });

  it('treats a tie as half a win to both sides', () => {
    // 17 + 1 − 10.5 − 3.5 = 4.
    expect(magicNumberOver(team('A', 10, 1, 1), team('B', 6, 3, 1), 17)).toBe(4);
  });

  /** A settled race stays at zero rather than going negative. */
  it('floors at zero once the rival cannot catch up', () => {
    expect(magicNumberOver(team('A', 16, 0), team('B', 0, 16), 17)).toBe(0);
  });
});

describe('clinchNumbers', () => {
  /**
   * Winning a division means shaking everyone in it, so the toughest rival
   * sets the number — not the nearest one in the table.
   */
  it('takes the magic number from the hardest rival to shake', () => {
    const [leader] = clinchNumbers(
      [team('A', 10, 2), team('B', 6, 6), team('C', 8, 4)],
      17,
    );

    // C have lost only 4, so they are the ones still in it: 18 − 10 − 4 = 4.
    expect(leader.magicNumber).toBe(4);
  });

  it('marks a club clinched once its magic number reaches zero', () => {
    const [leader, chaser] = clinchNumbers(
      [team('A', 15, 0), team('B', 0, 15)],
      17,
    );

    expect(leader).toMatchObject({
      magicNumber: 0,
      clinch: CLINCH_STATUS.clinched,
    });
    expect(chaser).toMatchObject({
      eliminationNumber: 0,
      clinch: CLINCH_STATUS.eliminated,
    });
  });

  /**
   * A lead is not a place. B can still finish on 12 wins — level with A's
   * current total — so one more event settles it and nothing yet has.
   */
  it('leaves a club one win from the division still contending', () => {
    const [leader] = clinchNumbers([team('A', 12, 2), team('B', 9, 5)], 17);

    expect(leader.magicNumber).toBe(1);
    expect(leader.clinch).toBe(CLINCH_STATUS.contending);
  });

  /**
   * Where the league publishes its own figures they are the authority — the
   * computed ones would quietly disagree about what "clinched" covers.
   */
  it('never overwrites a number or a status upstream already gave', () => {
    const published = {
      ...team('A', 10, 2),
      magicNumber: 3,
      clinch: CLINCH_STATUS.clinched,
    };
    const [result] = clinchNumbers([published, team('B', 8, 4)], 17);

    expect(result.magicNumber).toBe(3);
    expect(result.clinch).toBe(CLINCH_STATUS.clinched);
  });

  it('leaves a one-club group alone, having nobody to measure against', () => {
    const solo = [team('A', 10, 2)];
    expect(clinchNumbers(solo, 17)).toEqual(solo);
  });
});
