import styled from 'styled-components';
import type { StatusTone } from '@/styles';

export const Chip = styled.span<{ $tone: StatusTone }>`
  display: inline-block;
  padding: ${({ theme }) => `${theme.spacing(0.5)} ${theme.spacing(2)}`};
  border-radius: ${({ theme }) => theme.radii.sm};
  background: ${({ theme }) => theme.colors.background};
  color: ${({ $tone, theme }) => theme.colors.status[$tone]};
  font-size: 0.8rem;
  font-weight: 600;
`;
