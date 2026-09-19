import { Link } from 'react-router';
import styled from 'styled-components';

export const PlayerLink = styled(Link)`
  color: ${({ theme }) => theme.colors.text};
  text-decoration: none;

  &:hover {
    color: ${({ theme }) => theme.colors.primary};
    text-decoration: underline;
  }
`;
