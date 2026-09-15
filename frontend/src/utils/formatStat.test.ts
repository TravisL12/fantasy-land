import { formatPoints, formatStat } from './formatStat';

describe('formatStat', () => {
  it.each([
    [1715, 'int', '1,715'],
    [0.238, 'rate', '.238'],
    [1.0246, 'rate', '1.025'],
    [69.86, 'percent', '69.9%'],
    [0.9, 'decimal', '0.90'],
    [184.66667, 'decimal', '184.67'],
    [184.66667, 'innings', '184.2'],
    [7, 'innings', '7.0'],
    [undefined, 'int', '—'],
  ] as const)('formats %s as %s', (value, format, expected) => {
    expect(formatStat(value, format)).toBe(expected);
  });

  it('trims trailing zeros from points', () => {
    expect(formatPoints(12)).toBe('12');
    expect(formatPoints(12.5)).toBe('12.5');
  });
});
