import { barInset, isNumericAxis, seriesColors, sortByX, toTipRows } from './Chart.utils';

const points = [
  { x: 2, y: 18.4, series: 'Barkley' },
  { x: 1, y: 9, series: 'Barkley' },
  { x: 1, y: 12.2, series: 'Gibbs' },
];

describe('sortByX', () => {
  it('draws a numeric axis in order, whatever order the rows arrived in', () => {
    expect(sortByX(points).map(({ x }) => x)).toEqual([1, 1, 2]);
  });

  it('leaves a categorical axis in the order the source returned', () => {
    const categorical = [
      { x: 'Judge', y: 53, series: 'HR' },
      { x: 'Ohtani', y: 41, series: 'HR' },
    ];

    expect(sortByX(categorical)).toEqual(categorical);
  });
});

describe('isNumericAxis', () => {
  it('is false as soon as one x is a category', () => {
    expect(isNumericAxis(points)).toBe(true);
    expect(isNumericAxis([...points, { x: 'bye', y: 0, series: 'Barkley' }])).toBe(false);
  });
});

describe('toTipRows', () => {
  it('puts every series at an x into one tooltip, value first', () => {
    const [first] = toTipRows(points, (value) => value.toFixed(1));

    expect(first).toMatchObject({ x: 2, y: 18.4 });
    expect(first.text).toBe('2\n18.4  Barkley');
  });

  it('lists both series where they share an x', () => {
    const rows = toTipRows(points, String);

    expect(rows.find((row) => row.x === 1)?.text).toBe('1\n9  Barkley\n12.2  Gibbs');
  });
});

describe('barInset', () => {
  it('caps a bar rather than letting it fill a wide band', () => {
    // 600px over two bands, less Plot's 10% padding, is a 270px bar without it.
    expect(barInset(600, 2)).toBe(123);
  });

  it('insets nothing once the bands are narrower than the cap', () => {
    expect(barInset(200, 20)).toBe(0);
  });
});

describe('seriesColors', () => {
  it('assigns by position, so a color follows the series and not its rank', () => {
    expect(seriesColors(['b', 'a'], ['#1', '#2'])).toEqual(['#1', '#2']);
  });
});
