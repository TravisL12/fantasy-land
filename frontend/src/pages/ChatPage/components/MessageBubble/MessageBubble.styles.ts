import styled, { css, keyframes } from 'styled-components';
import { CHAT_ROLES, type ChatRole } from '@/api/chat';

export const Row = styled.div<{ $role: ChatRole }>`
  display: flex;
  justify-content: ${({ $role }) =>
    $role === CHAT_ROLES.user ? 'flex-end' : 'flex-start'};
`;

export const Bubble = styled.div<{ $role: ChatRole }>`
  max-width: min(680px, 100%);
  padding: ${({ theme }) => theme.spacing(3)};
  border-radius: ${({ theme }) => theme.radii.lg};
  line-height: 1.55;
  white-space: pre-wrap;
  word-break: break-word;

  ${({ theme, $role }) =>
    $role === CHAT_ROLES.user
      ? css`
          background: ${theme.colors.primary};
          color: ${theme.colors.onPrimary};
        `
      : css`
          background: ${theme.colors.surface};
          border: 1px solid ${theme.colors.border};
          color: ${theme.colors.text};
        `}
`;

export const Thinking = styled.details`
  margin-bottom: ${({ theme }) => theme.spacing(2)};
  color: ${({ theme }) => theme.colors.textMuted};
  font-size: 0.8rem;

  pre {
    margin: ${({ theme }) => theme.spacing(1)} 0 0;
    white-space: pre-wrap;
  }
`;

export const Muted = styled.span`
  color: ${({ theme }) => theme.colors.textMuted};
`;

const blink = keyframes`
  50% { opacity: 0; }
`;

export const Caret = styled.span`
  display: inline-block;
  width: 7px;
  height: 1em;
  margin-left: 2px;
  vertical-align: text-bottom;
  background: currentColor;
  animation: ${blink} 1s step-end infinite;
`;
