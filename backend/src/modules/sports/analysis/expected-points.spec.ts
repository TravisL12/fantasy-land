import { EXPECTED_POINTS_POOLED } from '../sports.constants.js';
import type { ScoredStatLine } from '../sports.types.js';
import { expectedPoints } from './expected-points.js';

const KEYS = ['rec_tgt', 'rush_att'];
const GAMES = 10;

/** A player whose points are exactly what the given rates imply. */
const line = (
  name: string,
  position: string,
  targets: number,
  carries: number,
  points: number,
  games = GAMES,
): ScoredStatLine => ({
  player: { id: name, name, team: 'ATL', position },
  gamesPlayed: games,
  stats: { rec_tgt: targets, rush_att: carries },
  fantasyPoints: points,
  fantasyPointsPerGame: points / games,
});

/** A league where a target is worth 1.5 points and a carry 0.5, exactly. */
const league = (count = 30, position = 'WR') =>
  Array.from({ length: count }, (_, i) => {
    const targets = 20 + i * 3;
    const carries = i % 5;
    return line(
      `${position}${i}`,
      position,
      targets,
      carries,
      targets * 1.5 + carries * 0.5,
    );
  });

describe('expectedPoints', () => {
  it('recovers the points each opportunity was actually worth', () => {
    const { models } = expectedPoints(league(), KEYS, { ridge: 0 });
    const wr = models.find((model) => model.position === 'WR')!;

    expect(wr.weights.rec_tgt).toBeCloseTo(1.5, 2);
    expect(wr.weights.rush_att).toBeCloseTo(0.5, 2);
    expect(wr.rSquared).toBeGreaterThan(0.99);
  });

  it('gives a player who scored exactly their opportunity a delta of zero', () => {
    const { lines } = expectedPoints(league(), KEYS, { ridge: 0 });

    for (const player of lines) {
      expect(player.delta).toBeCloseTo(0, 1);
      expect(player.efficiency).toBeCloseTo(1, 1);
    }
  });

  it('flags the player who beat their opportunity and the one who wasted it', () => {
    const hot = line('Hot', 'WR', 50, 0, 50 * 1.5 + 60);
    const cold = line('Cold', 'WR', 50, 0, 50 * 1.5 - 40);
    const { lines } = expectedPoints([...league(), hot, cold], KEYS, {
      ridge: 0,
    });

    const byName = new Map(lines.map((l) => [l.player.name, l]));
    expect(byName.get('Hot')!.delta).toBeGreaterThan(40);
    expect(byName.get('Hot')!.efficiency!).toBeGreaterThan(1);
    expect(byName.get('Cold')!.delta).toBeLessThan(-30);
    expect(byName.get('Cold')!.efficiency!).toBeLessThan(1);
    // Both were given the same chances, so they share an expectation.
    expect(byName.get('Hot')!.expectedPoints).toBeCloseTo(
      byName.get('Cold')!.expectedPoints,
      1,
    );
  });

  it('prices each position on its own players', () => {
    // Carries pay double for RBs, which a single pooled fit would average away.
    const backs = Array.from({ length: 30 }, (_, i) =>
      line(`RB${i}`, 'RB', i % 4, 40 + i * 2, (i % 4) * 1.5 + (40 + i * 2)),
    );
    const { models } = expectedPoints([...league(), ...backs], KEYS, {
      ridge: 0,
    });

    const rb = models.find((model) => model.position === 'RB')!;
    const wr = models.find((model) => model.position === 'WR')!;
    expect(rb.weights.rush_att).toBeGreaterThan(wr.weights.rush_att);
  });

  it('falls back to the pooled model for a position with too few players', () => {
    const rookie = line('Lone TE', 'TE', 30, 0, 45);
    const { lines, models } = expectedPoints([...league(), rookie], KEYS);

    expect(models.map(({ position }) => position)).not.toContain('TE');
    expect(lines.find((l) => l.player.name === 'Lone TE')!.model).toBe(
      EXPECTED_POINTS_POOLED,
    );
  });

  it('never prices an opportunity below zero', () => {
    // Carries here are pure noise, which an unconstrained fit can price negative.
    const noisy = Array.from({ length: 30 }, (_, i) =>
      line(`WR${i}`, 'WR', 20 + i * 3, i % 7, (20 + i * 3) * 1.5),
    );
    const { models, lines } = expectedPoints(noisy, KEYS);

    const wr = models.find((model) => model.position === 'WR')!;
    for (const weight of Object.values(wr.weights)) {
      expect(weight).toBeGreaterThanOrEqual(0);
    }
    for (const player of lines) {
      expect(player.expectedPoints).toBeGreaterThanOrEqual(0);
    }
  });

  it('keeps players below the games threshold out of the fit but still rates them', () => {
    const cameo = line('Cameo', 'WR', 3, 0, 30, 1);
    const { models, lines } = expectedPoints([...league(), cameo], KEYS, {
      ridge: 0,
    });

    expect(models.find((model) => model.position === 'WR')!.observations).toBe(
      30,
    );
    const rated = lines.find((l) => l.player.name === 'Cameo')!;
    expect(rated.expectedPoints).toBeCloseTo(4.5, 1);
    expect(rated.delta).toBeGreaterThan(20);
  });

  it('does not price an opportunity the position barely ever sees', () => {
    // One player in thirty ever carried the ball: a trick play, not a role.
    const receivers = Array.from({ length: 30 }, (_, i) =>
      line(`WR${i}`, 'WR', 20 + i * 3, i === 0 ? 4 : 0, (20 + i * 3) * 1.5 + (i === 0 ? 40 : 0)),
    );
    const { models, lines } = expectedPoints(receivers, KEYS);

    expect(models[0].weights.rush_att).toBe(0);
    // So the one who took them is credited with beating his usage, not with
    // having been handed forty points of expectation for four carries.
    expect(lines.find((l) => l.player.name === 'WR0')!.delta).toBeGreaterThan(30);
  });

  it('returns no models and no rows when nobody has any opportunity', () => {
    const empty = [line('Nobody', 'WR', 0, 0, 0)];
    const { models, lines } = expectedPoints(empty, KEYS);

    expect(models).toEqual([]);
    expect(lines).toEqual([]);
  });
});
