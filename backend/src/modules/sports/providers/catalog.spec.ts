import type { ScoringPreset, StatGroup } from '../sports.types.js';
import { MLB_GROUPS, MLB_SCORING_PRESETS } from './mlb/mlb.constants.js';
import { NFL_GROUPS, NFL_SCORING_PRESETS } from './nfl/nfl.constants.js';

// Providers only keep stats listed in their groups, so a scoring rule for an
// unlisted stat would silently score zero. These checks keep catalogs honest.
describe.each([
  ['mlb', MLB_GROUPS, MLB_SCORING_PRESETS],
  ['nfl', NFL_GROUPS, NFL_SCORING_PRESETS],
] as [string, StatGroup[], ScoringPreset[]][])(
  '%s catalog',
  (_sport, groups, presets) => {
    it.each(groups.map((g) => [g.key, g] as const))(
      '%s defaults are defined stats',
      (_key, group) => {
        const keys = group.stats.map((s) => s.key);
        expect(new Set(keys).size).toBe(keys.length);
        expect(group.defaultStats.filter((key) => !keys.includes(key))).toEqual(
          [],
        );
      },
    );

    it('only scores defined stats, for every group', () => {
      for (const preset of presets) {
        for (const group of groups) {
          const rules = preset.rules[group.key];
          expect(rules, `${preset.key} is missing ${group.key}`).toBeDefined();
          const keys = group.stats.map((s) => s.key);
          expect(
            Object.keys(rules).filter((stat) => !keys.includes(stat)),
          ).toEqual([]);
        }
      }
    });
  },
);
