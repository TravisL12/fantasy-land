import { Link } from 'react-router';
import styled from 'styled-components';

export const Card = styled(Link)`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing(3)};
  padding: ${({ theme }) => theme.spacing(6)};
  border-radius: ${({ theme }) => theme.radii.lg};
  border: 1px solid ${({ theme }) => theme.colors.border};
  background: ${({ theme }) => theme.colors.surface};
  color: ${({ theme }) => theme.colors.text};
  text-decoration: none;
  transition:
    border-color 120ms ease,
    transform 120ms ease;

  &:hover {
    border-color: ${({ theme }) => theme.colors.primary};
    transform: translateY(-2px);
  }
`;

export const League = styled.span`
  align-self: flex-start;
  padding: ${({ theme }) => `${theme.spacing(0.5)} ${theme.spacing(2)}`};
  border-radius: ${({ theme }) => theme.radii.sm};
  background: ${({ theme }) => theme.colors.primary};
  color: ${({ theme }) => theme.colors.onPrimary};
  font-size: 0.75rem;
  font-weight: 700;
  letter-spacing: 0.06em;
`;

export const Name = styled.h2`
  margin: 0;
  font-size: 1.4rem;
`;

export const Meta = styled.p`
  margin: 0;
  color: ${({ theme }) => theme.colors.textMuted};
  font-size: 0.9rem;
`;

export const Groups = styled.ul`
  display: flex;
  flex-wrap: wrap;
  gap: ${({ theme }) => theme.spacing(2)};
  margin: 0;
  padding: 0;
  list-style: none;
`;

export const GroupTag = styled.li`
  padding: ${({ theme }) => `${theme.spacing(0.5)} ${theme.spacing(2)}`};
  border-radius: ${({ theme }) => theme.radii.sm};
  border: 1px solid ${({ theme }) => theme.colors.border};
  font-size: 0.8rem;
  color: ${({ theme }) => theme.colors.textMuted};
`;

export const Cta = styled.span`
  margin-top: auto;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.primary};
`;
