import { Link } from 'react-router';
import styled from 'styled-components';

export const PlayerCell = styled.div`
  display: flex;
  flex-direction: column;
`;

export const PlayerLink = styled(Link)`
  color: ${({ theme }) => theme.colors.text};
  font-weight: 600;
  text-decoration: none;

  &:hover {
    color: ${({ theme }) => theme.colors.primary};
  }
`;

export const PlayerMeta = styled.span`
  font-size: 0.75rem;
  color: ${({ theme }) => theme.colors.textMuted};
`;

export const Rank = styled.span`
  color: ${({ theme }) => theme.colors.textMuted};
`;
