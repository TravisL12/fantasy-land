import styled from 'styled-components';
import type { StatusTone } from '@/styles';

export const Note = styled.p`
  margin: 0;
  max-width: 70ch;
  color: ${({ theme }) => theme.colors.textMuted};
  font-size: 0.8rem;
  line-height: 1.5;
`;

export const Starts = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: ${({ theme }) => theme.spacing(2)};
`;

/** Confirmed and projected must never look alike. */
export const Start = styled.span<{ $tone: StatusTone }>`
  color: ${({ $tone, theme }) => theme.colors.status[$tone]};
  font-size: 0.8rem;
  white-space: nowrap;
`;
