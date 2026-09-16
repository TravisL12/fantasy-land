import styled from 'styled-components';
import { CHART_SPEC } from './Chart.constants';

export const Figure = styled.figure`
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing(2)};
`;

export const Canvas = styled.div`
  width: 100%;
  min-height: ${CHART_SPEC.height}px;
  /* Plot's tooltip reads its fill from this variable. */
  --plot-background: ${({ theme }) => theme.colors.surface};

  /* Plot draws its own text; keep it on the muted ink token, never a series hue. */
  svg {
    display: block;
  }
`;

export const Legend = styled.ul`
  display: flex;
  flex-wrap: wrap;
  gap: ${({ theme }) => theme.spacing(4)};
  margin: 0;
  padding: 0;
  list-style: none;
  color: ${({ theme }) => theme.colors.textMuted};
  font-size: 0.85rem;
`;

export const LegendItem = styled.li`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing(2)};
`;

/** A rect for bars and areas, a short stroke for lines — the legend mirrors the mark. */
export const LegendKey = styled.span<{ $color: string; $line: boolean }>`
  display: inline-block;
  background: ${({ $color }) => $color};
  width: ${({ $line }) => ($line ? '16px' : '10px')};
  height: ${({ $line }) => ($line ? '2px' : '10px')};
  border-radius: ${({ $line, theme }) => ($line ? '1px' : theme.radii.sm)};
`;

export const Empty = styled.p`
  margin: 0;
  color: ${({ theme }) => theme.colors.textMuted};
  font-size: 0.9rem;
`;
