import { FORM_TRENDS } from '../sports.constants.js';
import type { ScoredGameLogEntry, StatDefinition } from '../sports.types.js';
import { analyzeForm } from './form.js';

const definitions: StatDefinition[] = [
  { key: 'homeRuns', label: 'HR', abbr: 'HR', format: 'int', summable: true },
  { key: 'avg', label: 'AVG', abbr: 'AVG', format: 'rate', summable: false },
];

const entry = (fantasyPoints: number, homeRuns = 0): ScoredGameLogEntry => ({
  date: null,
  week: null,
  opponent: null,
  isHome: null,
  stats: { homeRuns, avg: 0.3 },
  fantasyPoints,
});

describe('analyzeForm', () => {
  it('reads a rising recent split as hot', () => {
    const entries = [...Array(10).fill(entry(5)), ...Array(5).fill(entry(15))];

    const form = analyzeForm(entries, 5, definitions);

    expect(form.recent.average).toBe(15);
    expect(form.season.average).toBeCloseTo(8.33, 1);
    expect(form.delta).toBeCloseTo(6.67, 1);
    expect(form.trend).toBe(FORM_TRENDS.hot);
  });

  it('reads a falling recent split as cold', () => {
    const entries = [...Array(10).fill(entry(15)), ...Array(5).fill(entry(2))];

    expect(analyzeForm(entries, 5, definitions).trend).toBe(FORM_TRENDS.cold);
  });

  it('treats a small swing against a big season rate as steady', () => {
    const entries = [...Array(10).fill(entry(20)), ...Array(5).fill(entry(21))];

    expect(analyzeForm(entries, 5, definitions).trend).toBe(
      FORM_TRENDS.steady,
    );
  });

  it('totals only summable stats over the recent window', () => {
    const entries = [entry(5, 1), entry(5, 1), entry(5, 2)];

    const form = analyzeForm(entries, 2, definitions);

    expect(form.recentTotals).toEqual({ homeRuns: 3 });
  });

  it('uses the whole season when it is shorter than the window', () => {
    const entries = [entry(4), entry(6)];

    const form = analyzeForm(entries, 15, definitions);

    expect(form.recent.games).toBe(2);
    expect(form.delta).toBe(0);
    expect(form.trend).toBe(FORM_TRENDS.steady);
  });
});
