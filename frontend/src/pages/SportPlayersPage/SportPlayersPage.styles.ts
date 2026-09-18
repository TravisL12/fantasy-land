import { Link } from 'react-router';
import styled from 'styled-components';

export const Layout = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing(3)};
`;

export const Toolbar = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: flex-end;
  gap: ${({ theme }) => theme.spacing(3)};
`;

export const Explainer = styled.p`
  margin: 0;
  max-width: 70ch;
  color: ${({ theme }) => theme.colors.textMuted};
  font-size: 0.9rem;
  line-height: 1.5;
`;

export const PlayerLink = styled(Link)`
  color: ${({ theme }) => theme.colors.text};
  text-decoration: none;

  &:hover {
    color: ${({ theme }) => theme.colors.primary};
    text-decoration: underline;
  }
`;
