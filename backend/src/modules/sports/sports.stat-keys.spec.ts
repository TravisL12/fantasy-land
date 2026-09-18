import { MLB_GROUPS } from './providers/mlb/mlb.constants.js';
import { NFL_GROUPS } from './providers/nfl/nfl.constants.js';
import { findGroup } from './providers/provider.utils.js';
import { resolveStatKey } from './sports.utils.js';

const pitching = findGroup(MLB_GROUPS, 'pitching');
const hitting = findGroup(MLB_GROUPS, 'hitting');
const offense = findGroup(NFL_GROUPS, 'offense');

describe('resolveStatKey', () => {
  it('takes a key exactly as defined', () => {
    expect(resolveStatKey(pitching, 'strikeOuts')).toBe('strikeOuts');
    expect(resolveStatKey(offense, 'rec_yd')).toBe('rec_yd');
  });

  // The failure that started this: a model writes the English word.
  it('ignores casing and separators', () => {
    for (const written of ['strikeouts', 'strike_outs', 'Strike Outs']) {
      expect(resolveStatKey(pitching, written)).toBe('strikeOuts');
    }
    expect(resolveStatKey(hitting, 'home_runs')).toBe('homeRuns');
    expect(resolveStatKey(pitching, 'innings_pitched')).toBe('inningsPitched');
  });

  it('accepts the abbreviation and the label', () => {
    expect(resolveStatKey(pitching, 'K')).toBe('strikeOuts');
    expect(resolveStatKey(pitching, 'K/9')).toBe('strikeoutsPer9Inn');
    expect(resolveStatKey(hitting, 'batting average')).toBe('avg');
    expect(resolveStatKey(offense, 'receiving yards')).toBe('rec_yd');
    expect(resolveStatKey(offense, 'receptions')).toBe('rec');
  });

  // Ours is K; every box score in the sport calls it SO.
  it('accepts an alias the stat has no other name for', () => {
    expect(resolveStatKey(pitching, 'SO')).toBe('strikeOuts');
    expect(resolveStatKey(hitting, 'SO')).toBe('strikeOuts');
  });

  it('keeps near neighbours apart', () => {
    expect(resolveStatKey(pitching, 'strikeouts')).toBe('strikeOuts');
    expect(resolveStatKey(pitching, 'strikeouts per 9')).toBe(
      'strikeoutsPer9Inn',
    );
    expect(resolveStatKey(pitching, 'strikeoutWalkRatio')).toBe(
      'strikeoutWalkRatio',
    );
    expect(resolveStatKey(hitting, 'walks')).toBe('baseOnBalls');
  });

  it('rejects what it cannot resolve rather than guessing', () => {
    expect(resolveStatKey(pitching, 'homeRunsAllowedPerFly')).toBeUndefined();
    expect(resolveStatKey(pitching, 'stats.strikeOuts')).toBeUndefined();
    expect(resolveStatKey(offense, '')).toBeUndefined();
  });
});
