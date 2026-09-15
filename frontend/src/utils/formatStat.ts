import type { StatFormat } from '@/api/sports';

export const EMPTY_STAT = '—';

const trimZeros = (value: string) => value.replace(/\.?0+$/, '');

export const formatStat = (
  value: number | undefined | null,
  format: StatFormat,
) => {
  if (value === undefined || value === null || Number.isNaN(value))
    return EMPTY_STAT;

  switch (format) {
    case 'int':
      return value.toLocaleString();
    case 'rate':
      // Baseball style: .238, 1.024
      return value.toFixed(3).replace(/^0\./, '.');
    case 'percent':
      return `${value.toFixed(1)}%`;
    case 'decimal':
      return value.toFixed(2);
    case 'innings': {
      // Stored as thirds (184.667); baseball notation counts outs after the dot (184.2).
      const outs = Math.round(value * 3);
      return `${Math.trunc(outs / 3)}.${outs % 3}`;
    }
  }
};

export const formatPoints = (value: number) => trimZeros(value.toFixed(2));
