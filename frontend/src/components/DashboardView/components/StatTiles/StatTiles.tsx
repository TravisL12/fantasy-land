import { formatCell, getPath } from '../../DashboardView.utils';
import { Label, Tile, Tiles, Value } from './StatTiles.styles';
import type { StatTilesProps } from './StatTiles.types';

/** A handful of headline numbers — the honest form for data that isn't a chart. */
export const StatTiles = ({ widget, data }: StatTilesProps) => (
  <Tiles>
    {widget.tiles.map((tile) => (
      <Tile key={tile.key}>
        <Label>{tile.header}</Label>
        <Value $highlight={tile.highlight}>
          {formatCell(getPath(data, tile.path), tile.format)}
        </Value>
      </Tile>
    ))}
  </Tiles>
);
