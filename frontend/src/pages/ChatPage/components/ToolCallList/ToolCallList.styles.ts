import styled from 'styled-components';
import type { ToolStatus } from '../../ChatPage.types';

const statusColor = (theme: { colors: Record<string, string> }) => ({
  running: theme.colors.textMuted,
  ok: theme.colors.success,
  error: theme.colors.danger,
});

export const List = styled.ul`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing(1)};
  margin: 0 0 ${({ theme }) => theme.spacing(2)};
  padding: 0;
  list-style: none;
`;

export const Call = styled.li`
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radii.sm};
  background: ${({ theme }) => theme.colors.background};
`;

export const Summary = styled.summary`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing(2)};
  padding: ${({ theme }) => theme.spacing(2)};
  cursor: pointer;
  font-family: ${({ theme }) => theme.fonts.mono};
  font-size: 0.8rem;
  color: ${({ theme }) => theme.colors.text};
`;

export const Status = styled.span<{ $status: ToolStatus }>`
  color: ${({ theme, $status }) => statusColor(theme)[$status]};
  font-weight: 700;
`;

export const Args = styled.code`
  color: ${({ theme }) => theme.colors.textMuted};
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

export const Output = styled.pre`
  max-height: 260px;
  margin: 0;
  padding: ${({ theme }) => theme.spacing(2)};
  border-top: 1px solid ${({ theme }) => theme.colors.border};
  overflow: auto;
  font-family: ${({ theme }) => theme.fonts.mono};
  font-size: 0.75rem;
  color: ${({ theme }) => theme.colors.textMuted};
  white-space: pre-wrap;
  word-break: break-word;
`;
