import { Link } from 'react-router';
import styled from 'styled-components';

export const Heading = styled.h1`
  margin: 0 0 ${({ theme }) => theme.spacing(4)};
`;

export const SportsLink = styled(Link)`
  display: inline-block;
  margin-bottom: ${({ theme }) => theme.spacing(6)};
  font-weight: 600;
  color: ${({ theme }) => theme.colors.primary};
`;
