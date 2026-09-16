import styled from 'styled-components';

export const Empty = styled.p`
  margin: 0;
  color: ${({ theme }) => theme.colors.textMuted};
  font-size: 0.9rem;
`;

/** The winner is marked by weight and a check, never by color alone. */
export const Winner = styled.span`
  color: ${({ theme }) => theme.colors.text};
  font-weight: 700;

  &::after {
    content: ' ✓';
    color: ${({ theme }) => theme.colors.status.good};
  }
`;
