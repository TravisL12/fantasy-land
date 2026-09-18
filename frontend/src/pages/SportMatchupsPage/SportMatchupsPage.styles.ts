import styled from 'styled-components';

export const Layout = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing(3)};
`;

export const Toolbar = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: flex-end;
  gap: ${({ theme }) => theme.spacing(3)};
`;

export const Explainer = styled.p`
  margin: 0;
  max-width: 70ch;
  color: ${({ theme }) => theme.colors.textMuted};
  font-size: 0.9rem;
  line-height: 1.5;
`;

/** The bar is the rating; the number beside it is for anyone who needs exactness. */
export const Meter = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing(2)};
  min-width: 160px;
`;

export const Track = styled.div`
  flex: 1;
  height: 6px;
  border-radius: ${({ theme }) => theme.radii.sm};
  background: ${({ theme }) => theme.colors.background};
  overflow: hidden;
`;

export const Fill = styled.div<{ $percent: number; $tone: string }>`
  width: ${({ $percent }) => `${$percent}%`};
  height: 100%;
  background: ${({ $tone, theme }) =>
    theme.colors.status[$tone as keyof typeof theme.colors.status]};
`;

export const Grade = styled.span<{ $tone: string }>`
  color: ${({ $tone, theme }) =>
    theme.colors.status[$tone as keyof typeof theme.colors.status]};
  font-weight: 600;
  text-transform: capitalize;
`;

export const Metrics = styled.span`
  color: ${({ theme }) => theme.colors.textMuted};
  font-size: 0.8rem;
  font-family: ${({ theme }) => theme.fonts.mono};
`;
