import styled from 'styled-components';
import type { ChipProps } from './StatColumnPicker.types';

export const Panel = styled.details`
  border-radius: ${({ theme }) => theme.radii.lg};
  border: 1px solid ${({ theme }) => theme.colors.border};
  background: ${({ theme }) => theme.colors.surface};
`;

export const Summary = styled.summary`
  padding: ${({ theme }) => `${theme.spacing(3)} ${theme.spacing(4)}`};
  font-weight: 600;
  cursor: pointer;
`;

export const Body = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing(3)};
  padding: ${({ theme }) => `0 ${theme.spacing(4)} ${theme.spacing(4)}`};
`;

export const Hint = styled.span`
  font-size: 0.85rem;
  color: ${({ theme }) => theme.colors.textMuted};
`;

export const Chips = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: ${({ theme }) => theme.spacing(2)};
`;

export const Chip = styled.button<ChipProps>`
  padding: ${({ theme }) => `${theme.spacing(1)} ${theme.spacing(3)}`};
  border-radius: ${({ theme }) => theme.radii.lg};
  border: 1px solid
    ${({ $selected, theme }) => ($selected ? theme.colors.primary : theme.colors.border)};
  background: ${({ $selected, theme }) => ($selected ? theme.colors.primary : 'transparent')};
  color: ${({ $selected, theme }) => ($selected ? theme.colors.onPrimary : theme.colors.textMuted)};
  font: inherit;
  font-size: 0.85rem;
  cursor: pointer;

  &:hover {
    border-color: ${({ theme }) => theme.colors.primary};
  }
`;

export const Actions = styled.div`
  display: flex;
  justify-content: flex-end;
`;
