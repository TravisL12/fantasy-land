import styled from 'styled-components';

export const Tiles = styled.dl`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
  gap: ${({ theme }) => theme.spacing(3)};
  margin: 0;
`;

export const Tile = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing(1)};
  padding: ${({ theme }) => theme.spacing(3)};
  background: ${({ theme }) => theme.colors.surface};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radii.md};
`;

export const Label = styled.dt`
  color: ${({ theme }) => theme.colors.textMuted};
  font-size: 0.8rem;
`;

/**
 * Proportional figures: tabular-nums gives every digit a zero's width, which
 * reads loose at this size. It belongs in table columns, not on a tile.
 */
export const Value = styled.dd<{ $highlight?: boolean }>`
  margin: 0;
  font-size: 1.5rem;
  font-weight: 600;
  color: ${({ theme, $highlight }) =>
    $highlight ? theme.colors.primary : theme.colors.text};
`;
