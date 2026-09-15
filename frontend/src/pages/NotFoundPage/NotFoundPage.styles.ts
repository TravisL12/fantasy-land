import { Link } from 'react-router';
import styled from 'styled-components';

export const Heading = styled.h1`
  margin: 0 0 ${({ theme }) => theme.spacing(4)};
`;

export const HomeLink = styled(Link)`
  color: ${({ theme }) => theme.colors.primary};
`;
