import { NavLink } from 'react-router';
import styled from 'styled-components';

export const Bar = styled.header`
  flex-shrink: 0;
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing(6)};
  padding: ${({ theme }) => `${theme.spacing(3)} ${theme.spacing(6)}`};
  background: ${({ theme }) => theme.colors.surface};
  border-bottom: 1px solid ${({ theme }) => theme.colors.border};
`;

export const Title = styled.span`
  font-weight: 700;
  font-size: 1.1rem;
`;

export const Links = styled.nav`
  display: flex;
  gap: ${({ theme }) => theme.spacing(4)};
`;

export const Link = styled(NavLink)`
  color: ${({ theme }) => theme.colors.textMuted};
  text-decoration: none;

  &.active,
  &:hover {
    color: ${({ theme }) => theme.colors.text};
  }
`;
