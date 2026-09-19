import styled from 'styled-components';
import type { ToneProps } from './SportMatchupsPage.types';

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

export const Fill = styled.div<ToneProps & { $percent: number }>`
  width: ${({ $percent }) => `${$percent}%`};
  height: 100%;
  background: ${({ $tone, theme }) => theme.colors.status[$tone]};
`;

export const Grade = styled.span<ToneProps>`
  color: ${({ $tone, theme }) => theme.colors.status[$tone]};
  font-weight: 600;
  text-transform: capitalize;
`;

export const Metrics = styled.span`
  color: ${({ theme }) => theme.colors.textMuted};
  font-size: 0.8rem;
  font-family: ${({ theme }) => theme.fonts.mono};
`;
