import styled, { css } from 'styled-components';
import { STICKY_COLUMN_WIDTH } from './DataTable.constants';
import type { CellProps } from './DataTable.types';

export const Wrapper = styled.div<{ $isFetching?: boolean }>`
  overflow-x: auto;
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radii.lg};
  background: ${({ theme }) => theme.colors.surface};
  opacity: ${({ $isFetching }) => ($isFetching ? 0.6 : 1)};
  transition: opacity 120ms ease;
`;

export const Table = styled.table`
  width: 100%;
  border-collapse: collapse;
  font-size: 0.9rem;
  font-variant-numeric: tabular-nums;
`;

export const Caption = styled.caption`
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip: rect(0 0 0 0);
`;

const cell = css<CellProps>`
  padding: ${({ theme }) => `${theme.spacing(2.5)} ${theme.spacing(3)}`};
  text-align: ${({ $align }) => $align};
  white-space: nowrap;
  color: ${({ $highlight, theme }) => ($highlight ? theme.colors.text : 'inherit')};
  font-weight: ${({ $highlight }) => ($highlight ? 700 : 'inherit')};

  ${({ $sticky, theme }) =>
    $sticky &&
    css`
      position: sticky;
      left: 0;
      min-width: ${STICKY_COLUMN_WIDTH};
      background: ${theme.colors.surface};
      z-index: 1;
    `}
`;

export const HeaderCell = styled.th<CellProps>`
  ${cell}
  font-size: 0.75rem;
  font-weight: 600;
  letter-spacing: 0.04em;
  color: ${({ $highlight, theme }) => ($highlight ? theme.colors.primary : theme.colors.textMuted)};
  background: ${({ theme }) => theme.colors.surface};
  border-bottom: 1px solid ${({ theme }) => theme.colors.border};
`;

export const SortButton = styled.button`
  display: inline-flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing(1)};
  padding: 0;
  border: none;
  background: none;
  font: inherit;
  letter-spacing: inherit;
  color: inherit;
  cursor: pointer;

  &:hover {
    color: ${({ theme }) => theme.colors.text};
  }
`;

export const Row = styled.tr`
  border-bottom: 1px solid ${({ theme }) => theme.colors.border};

  &:last-child {
    border-bottom: none;
  }

  &:hover td {
    background: ${({ theme }) => theme.colors.surfaceHover};
  }
`;

export const Cell = styled.td<CellProps>`
  ${cell}
  color: ${({ $highlight, theme }) => ($highlight ? theme.colors.primary : theme.colors.text)};
`;

export const FooterCell = styled.td<CellProps>`
  ${cell}
  font-weight: 700;
  border-top: 1px solid ${({ theme }) => theme.colors.border};
  background: ${({ theme }) => theme.colors.surface};
`;

export const Empty = styled.td`
  padding: ${({ theme }) => theme.spacing(8)};
  text-align: center;
  color: ${({ theme }) => theme.colors.textMuted};
`;
