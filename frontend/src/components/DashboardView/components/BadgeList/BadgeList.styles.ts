import styled from 'styled-components';
import type { StatusTone } from '../../DashboardView.types';

export const List = styled.ul`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing(2)};
  margin: 0;
  padding: 0;
  list-style: none;
`;

export const Row = styled.li`
  display: flex;
  align-items: baseline;
  flex-wrap: wrap;
  gap: ${({ theme }) => theme.spacing(2)};
`;

export const Name = styled.span`
  color: ${({ theme }) => theme.colors.text};
  font-size: 0.95rem;
`;

/** A status is a word on a tinted chip — the color repeats it, never replaces it. */
export const Chip = styled.span<{ $tone: StatusTone }>`
  padding: ${({ theme }) => `${theme.spacing(0.5)} ${theme.spacing(2)}`};
  border-radius: ${({ theme }) => theme.radii.sm};
  border: 1px solid ${({ theme, $tone }) => theme.colors.status[$tone]};
  color: ${({ theme }) => theme.colors.text};
  font-size: 0.75rem;
  text-transform: uppercase;
  letter-spacing: 0.04em;
`;

export const Note = styled.span`
  color: ${({ theme }) => theme.colors.textMuted};
  font-size: 0.85rem;
`;
