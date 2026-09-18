import { formatCell, tileValue } from '../../DashboardView.utils';
import { Label, Tile, Tiles, Value } from './StatTiles.styles';
import type { StatTilesProps } from './StatTiles.types';

/** A handful of headline numbers — the honest form for data that isn't a chart. */
export const StatTiles = ({ widget, data, result }: StatTilesProps) => (
  <Tiles>
    {widget.tiles.map((tile) => (
      <Tile key={tile.key}>
        <Label>{tile.header}</Label>
        <Value $highlight={tile.highlight}>
          {formatCell(tileValue(data, result, tile.path), tile.format)}
        </Value>
      </Tile>
    ))}
  </Tiles>
);
