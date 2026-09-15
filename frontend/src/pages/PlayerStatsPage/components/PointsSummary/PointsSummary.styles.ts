import styled from 'styled-components';
import { SUMMARY_TILE_MIN_WIDTH } from './PointsSummary.constants';

export const Tiles = styled.dl`
  display: grid;
  grid-template-columns: repeat(
    auto-fit,
    minmax(${SUMMARY_TILE_MIN_WIDTH}, 1fr)
  );
  gap: ${({ theme }) => theme.spacing(3)};
  margin: 0;
`;

export const Tile = styled.div`
  padding: ${({ theme }) => theme.spacing(4)};
  border-radius: ${({ theme }) => theme.radii.lg};
  border: 1px solid ${({ theme }) => theme.colors.border};
  background: ${({ theme }) => theme.colors.surface};
`;

export const Label = styled.dt`
  font-size: 0.75rem;
  font-weight: 600;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: ${({ theme }) => theme.colors.textMuted};
`;

export const Value = styled.dd`
  margin: ${({ theme }) => theme.spacing(1)} 0 0;
  font-size: 1.5rem;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
`;
