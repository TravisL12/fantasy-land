import styled from 'styled-components';
import { WIDGET_WIDTHS, type WidgetWidth } from '@/api/dashboards';

export const Shell = styled.section`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing(6)};
`;

export const Toolbar = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing(3)};
`;

export const Updated = styled.span`
  color: ${({ theme }) => theme.colors.textMuted};
  font-size: 0.85rem;
`;

/** Two columns, so tiles and meters can sit beside each other rather than stack. */
export const Grid = styled.div`
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: ${({ theme }) => theme.spacing(6)};

  @media (max-width: 900px) {
    grid-template-columns: minmax(0, 1fr);
  }
`;

export const Widget = styled.article<{ $width?: WidgetWidth }>`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing(3)};
  min-width: 0;
  grid-column: ${({ $width }) =>
    $width === WIDGET_WIDTHS.half ? 'span 1' : 'span 2'};

  @media (max-width: 900px) {
    grid-column: span 1;
  }
`;

export const WidgetTitle = styled.h3`
  margin: 0;
  font-size: 1rem;
`;

export const Description = styled.p`
  margin: 0;
  color: ${({ theme }) => theme.colors.textMuted};
`;
