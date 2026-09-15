import { Link } from 'react-router';
import styled from 'styled-components';

export const Header = styled.header`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing(1)};
  margin-bottom: ${({ theme }) => theme.spacing(6)};
`;

export const BackLink = styled(Link)`
  align-self: flex-start;
  font-size: 0.9rem;
  color: ${({ theme }) => theme.colors.textMuted};
  text-decoration: none;

  &:hover {
    color: ${({ theme }) => theme.colors.text};
  }
`;

export const Title = styled.h1`
  margin: 0;
`;

export const Subtitle = styled.p`
  margin: 0;
  color: ${({ theme }) => theme.colors.textMuted};
`;
