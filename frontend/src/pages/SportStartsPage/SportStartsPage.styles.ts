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
export const Start = styled.span<{ $tone: string }>`
  color: ${({ $tone, theme }) =>
    theme.colors.status[$tone as keyof typeof theme.colors.status]};
  font-size: 0.8rem;
  white-space: nowrap;
`;
