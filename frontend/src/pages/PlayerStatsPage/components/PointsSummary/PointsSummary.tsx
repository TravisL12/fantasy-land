import { formatPoints } from '@/utils';
import { SUMMARY_TILES } from './PointsSummary.constants';
import { Label, Tile, Tiles, Value } from './PointsSummary.styles';
import type { PointsSummaryProps } from './PointsSummary.types';

export const PointsSummary = ({ summary }: PointsSummaryProps) => (
  <Tiles>
    {SUMMARY_TILES.map(({ key, label, hint }) => (
      <Tile key={key} title={hint}>
        <Label>{label}</Label>
        <Value>{formatPoints(summary[key])}</Value>
      </Tile>
    ))}
  </Tiles>
);
