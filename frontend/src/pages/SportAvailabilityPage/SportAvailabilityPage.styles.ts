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

export const Chip = styled.span<{ $tone: string }>`
  display: inline-block;
  padding: ${({ theme }) => `${theme.spacing(0.5)} ${theme.spacing(2)}`};
  border-radius: ${({ theme }) => theme.radii.sm};
  background: ${({ theme }) => theme.colors.background};
  color: ${({ $tone, theme }) =>
    theme.colors.status[$tone as keyof typeof theme.colors.status]};
  font-size: 0.8rem;
  font-weight: 600;
`;
