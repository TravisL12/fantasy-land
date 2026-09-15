import type { PointsSummary } from '@/api/sports';

export const SUMMARY_TILE_MIN_WIDTH = '130px';

export const SUMMARY_TILES: {
  key: keyof PointsSummary;
  label: string;
  hint: string;
}[] = [
  { key: 'games', label: 'Games', hint: 'Games with recorded stats' },
  { key: 'total', label: 'Total FPTS', hint: 'Fantasy points for the season' },
  { key: 'average', label: 'Avg / game', hint: 'Mean fantasy points per game' },
  {
    key: 'median',
    label: 'Median',
    hint: 'A typical game, less skewed by blowups',
  },
  {
    key: 'stdDev',
    label: 'Volatility',
    hint: 'Standard deviation — lower is more consistent',
  },
  { key: 'floor', label: 'Floor', hint: 'Worst game' },
  { key: 'ceiling', label: 'Ceiling', hint: 'Best game' },
];
