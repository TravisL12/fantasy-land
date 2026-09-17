import styled from 'styled-components';

/** The winner is marked by weight and a check, never by color alone. */
export const Winner = styled.span`
  color: ${({ theme }) => theme.colors.text};
  font-weight: 700;

  &::after {
    content: ' ✓';
    color: ${({ theme }) => theme.colors.status.good};
  }
`;
