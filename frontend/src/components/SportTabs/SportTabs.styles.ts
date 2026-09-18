import { NavLink } from 'react-router';
import styled from 'styled-components';

export const Tabs = styled.nav`
  display: flex;
  flex-wrap: wrap;
  gap: ${({ theme }) => theme.spacing(1)};
  border-bottom: 1px solid ${({ theme }) => theme.colors.border};
  padding-bottom: ${({ theme }) => theme.spacing(2)};
`;

export const Tab = styled(NavLink)`
  padding: ${({ theme }) => `${theme.spacing(1.5)} ${theme.spacing(3)}`};
  border-radius: ${({ theme }) => theme.radii.sm};
  color: ${({ theme }) => theme.colors.textMuted};
  font-size: 0.9rem;
  font-weight: 600;
  text-decoration: none;
  white-space: nowrap;

  &:hover {
    background: ${({ theme }) => theme.colors.surfaceHover};
    color: ${({ theme }) => theme.colors.text};
  }

  &.active {
    background: ${({ theme }) => theme.colors.primary};
    color: ${({ theme }) => theme.colors.onPrimary};
  }
`;
