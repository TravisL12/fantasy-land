import styled from 'styled-components';

export const Models = styled.p`
  margin: 0;
  display: flex;
  flex-wrap: wrap;
  gap: ${({ theme }) => theme.spacing(3)};
  color: ${({ theme }) => theme.colors.textMuted};
  font-size: 0.8rem;
  font-family: ${({ theme }) => theme.fonts.mono};
`;

/** Positive and negative deltas are the point of the table, so they carry color. */
export const Delta = styled.span<{ $positive: boolean }>`
  color: ${({ $positive, theme }) =>
    $positive ? theme.colors.success : theme.colors.danger};
`;
