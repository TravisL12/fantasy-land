import styled from 'styled-components';
import type { SegmentProps } from './SegmentedControl.types';

export const Group = styled.div`
  display: inline-flex;
  padding: ${({ theme }) => theme.spacing(1)};
  gap: ${({ theme }) => theme.spacing(1)};
  border-radius: ${({ theme }) => theme.radii.md};
  background: ${({ theme }) => theme.colors.background};
  border: 1px solid ${({ theme }) => theme.colors.border};
`;

export const Segment = styled.button<SegmentProps>`
  padding: ${({ theme }) => `${theme.spacing(1.5)} ${theme.spacing(3)}`};
  border: none;
  border-radius: ${({ theme }) => theme.radii.sm};
  font: inherit;
  font-size: 0.9rem;
  font-weight: 600;
  cursor: pointer;
  background: ${({ $active, theme }) => ($active ? theme.colors.primary : 'transparent')};
  color: ${({ $active, theme }) => ($active ? theme.colors.onPrimary : theme.colors.textMuted)};

  &:hover {
    color: ${({ $active, theme }) => ($active ? theme.colors.onPrimary : theme.colors.text)};
  }
`;
